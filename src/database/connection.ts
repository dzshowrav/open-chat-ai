import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDbPath(): string {
  const homeDir = os.homedir();
  const openChatDir = path.join(homeDir, '.openchat');
  
  if (!fs.existsSync(openChatDir)) {
    fs.mkdirSync(openChatDir, { recursive: true });
  }
  
  return path.join(openChatDir, 'openchat.db');
}

export function initDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  const db = new DatabaseSync(dbPath);

  // Enable WAL and Foreign Keys using PRAGMA executions
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Load and apply schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    // Fallback checking for development paths
    const altSchemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
    if (fs.existsSync(altSchemaPath)) {
      const schemaSql = fs.readFileSync(altSchemaPath, 'utf8');
      db.exec(schemaSql);
    } else {
      throw new Error(`Database schema.sql file could not be found at ${schemaPath} or ${altSchemaPath}`);
    }
  }

  // Dynamic migration: Ensure tool_call_id column exists in messages table
  try {
    const columns = db.prepare("PRAGMA table_info(messages);").all() as any[];
    const hasToolCallId = columns.some(c => c.name === 'tool_call_id');
    if (!hasToolCallId) {
      db.exec("ALTER TABLE messages ADD COLUMN tool_call_id TEXT;");
    }
    const hasReasoning = columns.some(c => c.name === 'reasoning_content');
    if (!hasReasoning) {
      db.exec("ALTER TABLE messages ADD COLUMN reasoning_content TEXT;");
    }
  } catch (err) {
    console.error('Database migration failed for messages table:', err);
  }

  // Insert default settings, agents, and themes if they don't exist
  seedDefaults(db);

  dbInstance = db;
  return db;
}

// Transaction helper to run multiple queries in a transaction
export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

function seedDefaults(db: DatabaseSync): void {
  // Seed initial settings if table is empty
  const checkSettings = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (checkSettings.count === 0) {
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSetting.run('theme', JSON.stringify({ themeId: 'tokyo-night', wordWrap: true }));
    insertSetting.run('streaming', JSON.stringify({ enabled: true }));
    insertSetting.run('permissions', JSON.stringify({ defaultLevel: 'ask' }));
  }

  // Seed default agents if empty
  const checkAgents = db.prepare("SELECT COUNT(*) as count FROM agents").get() as { count: number };
  if (checkAgents.count === 0) {
    const insertAgent = db.prepare(`
      INSERT INTO agents (name, description, icon, prompt, reasoning_level, temperature, default_skills, allowed_tools, enabled, built_in)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertAgent.run(
      'General',
      'A versatile general-purpose development assistant.',
      '\u{F06A9}',
      'You are a highly skilled software development assistant. You provide clear, accurate code solutions, explain your logic step-by-step, and use available tools to inspect or edit the project workspace as needed.',
      0,
      0.7,
      JSON.stringify([]),
      JSON.stringify(['read_file', 'write_file', 'edit_file', 'list_directory', 'glob', 'grep', 'bash', 'git_status', 'git_diff', 'git_commit', 'git_add']),
      1,
      1
    );

    insertAgent.run(
      'Debugger',
      'Specialized in reading logs, stack traces, and fixing bugs.',
      '\u{F188}',
      'You are a debugging expert. Your primary goal is to find, analyze, and fix bugs in code. You are extremely methodical: you read log files, trace execution paths, inspect variable definitions, write targeted unit tests, and verify fix correctness.',
      0,
      0.2,
      JSON.stringify([]),
      JSON.stringify(['read_file', 'write_file', 'edit_file', 'grep', 'bash']),
      1,
      1
    );
  }

  // Retroactively clean up emojis for existing databases
  try {
    db.exec("UPDATE agents SET icon = '\u{F06A9}' WHERE icon = '🤖' OR icon = '[Agent]';");
    db.exec("UPDATE agents SET icon = '\u{F188}' WHERE icon = '🐞' OR icon = '[Bug]';");
  } catch (err) {
    // Ignore migration warning if tables are locked or empty
  }

  // Seed default tool permissions if empty
  const checkPermissions = db.prepare("SELECT COUNT(*) as count FROM permissions").get() as { count: number };
  if (checkPermissions.count === 0) {
    const insertPermission = db.prepare("INSERT INTO permissions (tool_name, permission) VALUES (?, ?)");
    
    // Read-only tools default to always_allow
    insertPermission.run('read_file', 'always_allow');
    insertPermission.run('list_directory', 'always_allow');
    insertPermission.run('glob', 'always_allow');
    insertPermission.run('grep', 'always_allow');
    
    // Modification/execution tools default to ask
    insertPermission.run('write_file', 'ask');
    insertPermission.run('edit_file', 'ask');
    insertPermission.run('delete_file', 'ask');
    insertPermission.run('bash', 'ask');
    insertPermission.run('git_push', 'ask');
    insertPermission.run('git_commit', 'ask');
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    // In node:sqlite DatabaseSync has no explicit close method in some node releases or it does.
    // Let's check if close exists, otherwise nullify. Node.js DatabaseSync has close().
    const db = dbInstance as any;
    if (typeof db.close === 'function') {
      db.close();
    }
    dbInstance = null;
  }
}
