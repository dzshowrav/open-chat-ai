import { initDatabase } from '../connection.js';
import { Agent } from '../../types/index.js';
import type { AgentRow } from '../../types/database.js';

export class AgentRepository {
  private getDb() {
    return initDatabase();
  }

  addAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): number {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO agents (name, description, icon, prompt, reasoning_level, temperature, default_skills, allowed_tools, enabled, built_in)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      agent.name,
      agent.description || null,
      agent.icon || null,
      agent.prompt,
      agent.reasoning_level || 0,
      agent.temperature || 0.7,
      JSON.stringify(agent.default_skills || []),
      JSON.stringify(agent.allowed_tools || []),
      agent.enabled ? 1 : 0,
      agent.built_in ? 1 : 0
    );

    return result.lastInsertRowid as number;
  }

  getAgent(id: number): Agent | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;
    return row ? this.mapRow(row) : undefined;
  }

  getAgentByName(name: string): Agent | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM agents WHERE name = ?").get(name) as AgentRow | undefined;
    return row ? this.mapRow(row) : undefined;
  }

  listAgents(): Agent[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM agents WHERE enabled = 1 ORDER BY built_in DESC, name ASC").all() as unknown as AgentRow[];
    return rows.map(r => this.mapRow(r));
  }

  updateAgent(id: number, updates: Partial<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>): void {
    const db = this.getDb();
    const fields = Object.keys(updates);
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = fields.map(field => {
      const val = (updates as any)[field];
      if (field === 'default_skills' || field === 'allowed_tools') {
        return JSON.stringify(val);
      }
      if (typeof val === 'boolean') {
        return val ? 1 : 0;
      }
      return val;
    });
    params.push(id);

    const stmt = db.prepare(`
      UPDATE agents
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...params);
  }

  deleteAgent(id: number): void {
    const db = this.getDb();
    // Cannot delete built-in system agents
    const stmt = db.prepare("DELETE FROM agents WHERE id = ? AND built_in = 0");
    stmt.run(id);
  }

  private mapRow(row: AgentRow): Agent {
    let defaultSkills: string[] = [];
    let allowedTools: string[] = [];
    try {
      defaultSkills = row.default_skills ? JSON.parse(row.default_skills) : [];
    } catch {
      defaultSkills = [];
    }
    try {
      allowedTools = row.allowed_tools ? JSON.parse(row.allowed_tools) : [];
    } catch {
      allowedTools = [];
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      icon: row.icon || undefined,
      prompt: row.prompt,
      reasoning_level: row.reasoning_level,
      temperature: row.temperature,
      default_skills: defaultSkills,
      allowed_tools: allowedTools,
      enabled: row.enabled === 1,
      built_in: row.built_in === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
