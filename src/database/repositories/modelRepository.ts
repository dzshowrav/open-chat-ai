import { initDatabase } from '../connection.js';
import { Model } from '../../types/index.js';
import type { ModelRow } from '../../types/database.js';

export class ModelRepository {
  private getDb() {
    return initDatabase();
  }

  addModel(model: Omit<Model, 'id' | 'favorite' | 'enabled' | 'created_at' | 'updated_at'>): number {
    const db = this.getDb();
    
    const stmt = db.prepare(`
      INSERT INTO models (
        provider_id, model_id, display_name, description, category,
        supports_streaming, supports_tools, supports_reasoning,
        supports_vision, supports_json, supports_audio, supports_embedding,
        max_context, max_output, favorite, enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `);
    
    const result = stmt.run(
      model.provider_id,
      model.model_id,
      model.display_name,
      model.description || null,
      model.category || 'general',
      model.supports_streaming ? 1 : 0,
      model.supports_tools ? 1 : 0,
      model.supports_reasoning ? 1 : 0,
      model.supports_vision ? 1 : 0,
      model.supports_json ? 1 : 0,
      model.supports_audio ? 1 : 0,
      model.supports_embedding ? 1 : 0,
      model.max_context || 4096,
      model.max_output || 2048
    );

    return result.lastInsertRowid as number;
  }

  getModel(id: number): Model | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM models WHERE id = ?").get(id) as ModelRow | undefined;
    return row ? this.mapRow(row) : undefined;
  }

  getModelByStringId(providerId: number, modelId: string): Model | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM models WHERE provider_id = ? AND model_id = ?").get(providerId, modelId) as ModelRow | undefined;
    return row ? this.mapRow(row) : undefined;
  }

  listModels(providerId?: number): Model[] {
    const db = this.getDb();
    let rows: ModelRow[];
    if (providerId !== undefined) {
      rows = db.prepare("SELECT * FROM models WHERE provider_id = ? ORDER BY favorite DESC, display_name ASC").all(providerId) as unknown as ModelRow[];
    } else {
      rows = db.prepare("SELECT * FROM models ORDER BY provider_id ASC, favorite DESC, display_name ASC").all() as unknown as ModelRow[];
    }
    return rows.map(r => this.mapRow(r));
  }

  updateModel(id: number, updates: Partial<Omit<Model, 'id' | 'provider_id' | 'created_at' | 'updated_at'>>): void {
    const db = this.getDb();
    
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => {
      const val = (updates as any)[field];
      if (typeof val === 'boolean') {
        return val ? 1 : 0;
      }
      return val;
    });
    params.push(id);

    const stmt = db.prepare(`
      UPDATE models
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(...params);
  }

  deleteModel(id: number): void {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM models WHERE id = ?");
    stmt.run(id);
  }

  setFavoriteModel(id: number, favorite: boolean): void {
    const db = this.getDb();
    const stmt = db.prepare("UPDATE models SET favorite = ? WHERE id = ?");
    stmt.run(favorite ? 1 : 0, id);
  }

  private mapRow(row: ModelRow): Model {
    return {
      id: row.id,
      provider_id: row.provider_id,
      model_id: row.model_id,
      display_name: row.display_name,
      description: row.description || undefined,
      category: row.category,
      supports_streaming: row.supports_streaming === 1,
      supports_tools: row.supports_tools === 1,
      supports_reasoning: row.supports_reasoning === 1,
      supports_vision: row.supports_vision === 1,
      supports_json: row.supports_json === 1,
      supports_audio: row.supports_audio === 1,
      supports_embedding: row.supports_embedding === 1,
      max_context: row.max_context,
      max_output: row.max_output,
      favorite: row.favorite === 1,
      enabled: row.enabled === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
