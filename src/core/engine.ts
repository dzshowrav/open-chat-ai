import { initDatabase, closeDatabase } from '../database/connection.js';
import { stateManager } from './state.js';
import { eventBus } from './events.js';
import { DatabaseSync } from 'node:sqlite';
import { registerBuiltInTools } from '../tools/impl/index.js';
import { McpManager } from '../mcp/mcpManager.js';

export class AppEngine {
  private db: DatabaseSync | null = null;

  async start(): Promise<void> {
    try {
      this.db = initDatabase();

      // Listen to process exit signals to ensure clean teardown
      process.on('SIGINT', () => this.exit(0));
      process.on('SIGTERM', () => this.exit(0));
      process.on('exit', () => {
        McpManager.disconnectAll();
        closeDatabase();
      });

      // Register built-in tools
      registerBuiltInTools();

      // Initialize workspace
      this.initWorkspace();

      // Load settings
      this.loadSettings();

      // Load default provider & model
      this.loadActiveModel();

      // Initialize MCP servers
      await McpManager.init();

      // Trigger start event
      eventBus.emit('app:start', undefined);
    } catch (error) {
      console.error('Failed to start OpenChat CLI Engine:', error);
      this.exit(1);
    }
  }

  private initWorkspace(): void {
    const cwd = process.cwd();
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO workspace (name, path, created_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(path) DO UPDATE SET last_scan = CURRENT_TIMESTAMP
        `);
        const folderName = cwd.split('/').pop() || 'workspace';
        stmt.run(folderName, cwd);
        
        const wsRecord = this.db.prepare("SELECT id FROM workspace WHERE path = ?").get(cwd) as { id: number };
        stateManager.setState({ activeWorkspaceId: wsRecord.id, workspacePath: cwd });
      } catch (err) {
        console.error('Failed to initialize workspace record in DB:', err);
      }
    }
  }

  private loadSettings(): void {
    if (this.db) {
      try {
        const settings = this.db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
        const settingsMap: Record<string, any> = {};
        for (const row of settings) {
          settingsMap[row.key] = JSON.parse(row.value);
        }
      } catch (err) {
        console.error('Failed to load settings from DB:', err);
      }
    }
  }

  private loadActiveModel(): void {
    if (this.db) {
      try {
        // Query default provider
        const defaultProvider = this.db.prepare("SELECT id, name FROM providers WHERE is_default = 1").get() as { id: number; name: string } | undefined;
        
        if (defaultProvider) {
          stateManager.setState({ activeProviderId: defaultProvider.id });
          
          // Query active/enabled model for this provider
          const activeModel = this.db.prepare("SELECT model_id FROM models WHERE provider_id = ? AND enabled = 1 ORDER BY favorite DESC, id ASC LIMIT 1").get(defaultProvider.id) as { model_id: string } | undefined;
          
          if (activeModel) {
            stateManager.setState({ activeModelId: activeModel.model_id });
            eventBus.emit('model:changed', { modelId: activeModel.model_id, providerId: defaultProvider.id });
          }
        }
      } catch (err) {
        console.error('Failed to load active model from DB:', err);
      }
    }
  }

  exit(code: number = 0): void {
    eventBus.emit('app:exit', undefined);
    McpManager.disconnectAll();
    closeDatabase();
    process.exit(code);
  }
}
