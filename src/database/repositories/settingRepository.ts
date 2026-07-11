import { initDatabase } from '../connection.js';

export class SettingRepository {
  private getDb() {
    return initDatabase();
  }

  getSetting<T = any>(key: string): T | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  setSetting(key: string, value: any): void {
    const db = this.getDb();
    const valueStr = JSON.stringify(value);
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, valueStr, valueStr);
  }

  listSettings(): Record<string, any> {
    const db = this.getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
    const result: Record<string, any> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  }
}
