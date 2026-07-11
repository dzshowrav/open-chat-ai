import { initDatabase } from '../connection.js';

export interface Workspace {
  id: number;
  name: string;
  path: string;
  language?: string;
  framework?: string;
  package_manager?: string;
  git_branch?: string;
  last_scan?: string;
  created_at: string;
}

export class WorkspaceRepository {
  private getDb() {
    return initDatabase();
  }

  addWorkspace(name: string, path: string): number {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO workspace (name, path, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(path) DO UPDATE SET last_scan = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(name, path);
    
    if (result.changes === 0) {
      // If it existed and was updated, fetch the ID
      const row = db.prepare("SELECT id FROM workspace WHERE path = ?").get(path) as { id: number };
      return row.id;
    }
    
    return result.lastInsertRowid as number;
  }

  getWorkspace(id: number): Workspace | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM workspace WHERE id = ?").get(id) as any;
    return row ? this.mapRow(row) : undefined;
  }

  getWorkspaceByPath(path: string): Workspace | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM workspace WHERE path = ?").get(path) as any;
    return row ? this.mapRow(row) : undefined;
  }

  listWorkspaces(): Workspace[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM workspace ORDER BY last_scan DESC, id DESC").all() as any[];
    return rows.map(r => this.mapRow(r));
  }

  updateWorkspace(id: number, updates: Partial<Omit<Workspace, 'id' | 'created_at'>>): void {
    const db = this.getDb();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    const stmt = db.prepare(`
      UPDATE workspace
      SET ${setClause}
      WHERE id = ?
    `);
    stmt.run(...params);
  }

  private mapRow(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      language: row.language || undefined,
      framework: row.framework || undefined,
      package_manager: row.package_manager || undefined,
      git_branch: row.git_branch || undefined,
      last_scan: row.last_scan || undefined,
      created_at: row.created_at
    };
  }
}
