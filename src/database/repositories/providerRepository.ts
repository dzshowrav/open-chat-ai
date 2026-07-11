import { initDatabase, runInTransaction } from '../connection.js';
import { Provider } from '../../types/index.js';
import crypto from 'crypto';

export class ProviderRepository {
  private getDb() {
    return initDatabase();
  }

  addProvider(provider: Omit<Provider, 'id' | 'uuid' | 'is_default' | 'created_at' | 'updated_at'>): number {
    const db = this.getDb();
    const uuid = crypto.randomUUID();
    const isDefault = this.listProviders().length === 0 ? 1 : 0;
    
    const stmt = db.prepare(`
      INSERT INTO providers (uuid, name, description, base_url, api_key, status, latency, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      uuid,
      provider.name,
      provider.description || null,
      provider.base_url,
      provider.api_key,
      provider.status || 'unknown',
      provider.latency || 0,
      isDefault
    ) as { lastInsertRowid: number | bigint };

    return Number(result.lastInsertRowid);
  }

  getProvider(id: number): Provider | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM providers WHERE id = ?").get(id) as any;
    return row ? this.mapRow(row) : undefined;
  }

  getProviderByName(name: string): Provider | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM providers WHERE name = ?").get(name) as any;
    return row ? this.mapRow(row) : undefined;
  }

  listProviders(): Provider[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM providers ORDER BY is_default DESC, name ASC").all() as any[];
    return rows.map(r => this.mapRow(r));
  }

  updateProvider(id: number, updates: Partial<Omit<Provider, 'id' | 'uuid' | 'created_at' | 'updated_at'>>): void {
    const db = this.getDb();
    
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => (updates as any)[field]);
    params.push(id);

    const stmt = db.prepare(`
      UPDATE providers
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(...params);
  }

  deleteProvider(id: number): void {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM providers WHERE id = ?");
    stmt.run(id);
  }

  setDefaultProvider(id: number): void {
    const db = this.getDb();
    
    runInTransaction(db, () => {
      db.prepare("UPDATE providers SET is_default = 0").run();
      db.prepare("UPDATE providers SET is_default = 1 WHERE id = ?").run(id);
    });
  }

  private mapRow(row: any): Provider {
    return {
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      description: row.description || undefined,
      base_url: row.base_url,
      api_key: row.api_key,
      status: row.status,
      latency: row.latency,
      is_default: row.is_default === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
