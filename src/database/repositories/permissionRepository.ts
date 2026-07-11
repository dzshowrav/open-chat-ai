import { initDatabase } from '../connection.js';
import { PermissionLevel } from '../../core/constants.js';

export class PermissionRepository {
  private getDb() {
    return initDatabase();
  }

  getPermission(toolName: string): PermissionLevel {
    const db = this.getDb();
    const row = db.prepare("SELECT permission FROM permissions WHERE tool_name = ?").get(toolName) as { permission: string } | undefined;
    
    if (!row) {
      return 'ask'; // Default to ask policy
    }
    
    return row.permission as PermissionLevel;
  }

  setPermission(toolName: string, permission: PermissionLevel): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO permissions (tool_name, permission, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tool_name) DO UPDATE SET permission = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(toolName, permission, permission);
  }

  listPermissions(): Record<string, PermissionLevel> {
    const db = this.getDb();
    const rows = db.prepare("SELECT tool_name, permission FROM permissions").all() as Array<{ tool_name: string; permission: string }>;
    const result: Record<string, PermissionLevel> = {};
    for (const row of rows) {
      result[row.tool_name] = row.permission as PermissionLevel;
    }
    return result;
  }
}
