import { initDatabase, closeDatabase, getDbPath } from '../database/connection.js';
import { stateManager } from './state.js';
import { eventBus } from './events.js';
import { DatabaseSync } from 'node:sqlite';
import { registerBuiltInTools } from '../tools/impl/index.js';
import { McpManager } from '../mcp/mcpManager.js';
import { APP_VERSION } from './constants.js';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const installRoot = path.resolve(__dirname, '../../');

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

      // Check for updates asynchronously
      this.checkForUpdates();

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

  private async checkForUpdates(): Promise<void> {
    try {
      const response = await fetch('https://raw.githubusercontent.com/dzshowrav/open-chat-ai/master/package.json');
      if (response.ok) {
        const data = await response.json() as { version: string };
        if (data && data.version) {
          const latest = data.version;
          const current = APP_VERSION;
          
          if (latest !== current) {
            const parseVer = (v: string) => v.split('.').map(Number);
            const lParts = parseVer(latest);
            const cParts = parseVer(current);
            let newer = false;
            for (let i = 0; i < 3; i++) {
              if (lParts[i] > cParts[i]) {
                newer = true;
                break;
              } else if (lParts[i] < cParts[i]) {
                break;
              }
            }
            if (newer) {
              stateManager.setState({ isUpdateAvailable: true, latestVersion: latest });
            }
          }
        }
      }
    } catch (err) {
      // Fail silently (no connection, etc)
    }
  }

  async updateToLatest(): Promise<{ success: boolean; error?: string }> {
    const fs = await import('fs');
    const path = await import('path');
    const { exec } = await import('child_process');

    const hasGit = fs.existsSync(path.join(installRoot, '.git'));

    const runCommand = (cmd: string, cwd?: string): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> => {
      return new Promise((resolve) => {
        const env = {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_EDITOR: 'true',
          PAGER: 'cat'
        };
        
        exec(cmd, { cwd, env, timeout: 180000 }, (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              stdout: stdout || '',
              stderr: stderr || '',
              error: error.message
            });
          } else {
            resolve({
              success: true,
              stdout: stdout || '',
              stderr: stderr || ''
            });
          }
        });
      });
    };

    if (hasGit) {
      // 1. Detect branch name
      let branch = 'master';
      const branchRes = await runCommand('git symbolic-ref --short HEAD', installRoot);
      if (branchRes.success && branchRes.stdout.trim()) {
        branch = branchRes.stdout.trim();
      }

      // 2. Check for local modifications/untracked files
      const statusRes = await runCommand('git status --porcelain', installRoot);
      if (!statusRes.success) {
        return { success: false, error: `Git status check failed: ${statusRes.error}` };
      }

      const hasLocalChanges = statusRes.stdout.trim().length > 0;
      let stashed = false;

      if (hasLocalChanges) {
        // Stash local changes including untracked files
        const stashRes = await runCommand('git stash -u -m "Auto-stash before update"', installRoot);
        if (stashRes.success && !stashRes.stdout.includes('No local changes to save')) {
          stashed = true;
        }
      }

      // 3. Fetch latest changes
      const fetchRes = await runCommand('git fetch origin', installRoot);
      if (!fetchRes.success) {
        if (stashed) await runCommand('git stash pop', installRoot);
        return { success: false, error: `Git fetch failed: ${fetchRes.stderr || fetchRes.error}` };
      }

      // 4. Pull latest changes
      const pullRes = await runCommand(`git pull --no-edit origin ${branch} || git pull --no-edit`, installRoot);
      if (!pullRes.success) {
        // If git pull failed, abort the merge in case it left a merging state and restore stash
        await runCommand('git merge --abort', installRoot);
        if (stashed) await runCommand('git stash pop', installRoot);
        return { success: false, error: `Git pull failed: ${pullRes.stderr || pullRes.error}` };
      }

      // 5. Restore local changes (stash pop)
      if (stashed) {
        const popRes = await runCommand('git stash pop', installRoot);
        if (!popRes.success) {
          console.warn('Conflict occurred while restoring local changes. Please resolve manually.');
        }
      }

      // 6. Install dependencies
      const installRes = await runCommand('npm install --no-bin-links', installRoot);
      if (!installRes.success) {
        // Retry with legacy peer deps
        const retryRes = await runCommand('npm install --no-bin-links --legacy-peer-deps', installRoot);
        if (!retryRes.success) {
          return { success: false, error: `Dependency installation failed: ${retryRes.stderr || retryRes.error}` };
        }
      }

      // 7. Rebuild project
      const buildRes = await runCommand('npm run build', installRoot);
      if (!buildRes.success) {
        return { success: false, error: `Build failed: ${buildRes.stderr || buildRes.error}` };
      }

      return { success: true };
    } else {
      // Non-git installation (global npm install)
      const updateRes = await runCommand('npm install -g git+https://github.com/dzshowrav/open-chat-ai.git');
      if (!updateRes.success) {
        return { success: false, error: `Global npm update failed: ${updateRes.stderr || updateRes.error}` };
      }
      return { success: true };
    }
  }

  async uninstall(): Promise<boolean> {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const exec = (await import('child_process')).exec;

    const dbPath = getDbPath();
    const openChatDir = path.dirname(dbPath); // ~/.openchat
    const homePath = os.homedir();
    const configDir = path.join(homePath, '.config', 'openchat');

    return new Promise((resolve) => {
      // 1. Remove database folder
      if (fs.existsSync(openChatDir)) {
        try {
          fs.rmSync(openChatDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Failed to remove global storage directory:', err);
        }
      }

      // 2. Remove configuration folder
      if (fs.existsSync(configDir)) {
        try {
          fs.rmSync(configDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Failed to remove configuration directory:', err);
        }
      }

      // 3. Uninstall global package
      exec('npm uninstall -g openchat-ai', (error) => {
        if (error) {
          console.error(`Uninstall error: ${error.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async clean(): Promise<void> {
    const fs = await import('fs');
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database cleaned up successfully (fresh installation state).');
    } else {
      console.log('No database found to clean up.');
    }
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch {}
    }
  }
}
