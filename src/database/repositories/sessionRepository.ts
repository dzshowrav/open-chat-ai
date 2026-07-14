import { initDatabase, runInTransaction } from '../connection.js';
import { Session, Message } from '../../types/index.js';
import type { SessionRow, MessageRow } from '../../types/database.js';

export class SessionRepository {
  private getDb() {
    return initDatabase();
  }

  createSession(session: {
    title: string;
    provider_id?: number;
    model_id?: number;
    agent_id?: number;
    workspace_id?: number;
    summary?: string;
  }): number {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO sessions (title, provider_id, model_id, agent_id, workspace_id, summary, favorite, archived)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `);
    
    const result = stmt.run(
      session.title,
      session.provider_id || null,
      session.model_id || null,
      session.agent_id || null,
      session.workspace_id || null,
      session.summary || null
    ) as { lastInsertRowid: number | bigint };

    return Number(result.lastInsertRowid);
  }

  getSession(id: number): Session | undefined {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
    return row ? this.mapSessionRow(row) : undefined;
  }

  listSessions(workspaceId?: number): Session[] {
    const db = this.getDb();
    let rows: SessionRow[];
    if (workspaceId !== undefined) {
      rows = db.prepare("SELECT * FROM sessions WHERE workspace_id = ? AND archived = 0 ORDER BY updated_at DESC").all(workspaceId) as unknown as SessionRow[];
    } else {
      rows = db.prepare("SELECT * FROM sessions WHERE archived = 0 ORDER BY updated_at DESC").all() as unknown as SessionRow[];
    }
    return rows.map(r => this.mapSessionRow(r));
  }

  updateSession(id: number, updates: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>): void {
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
      UPDATE sessions
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(...params);
  }

  deleteSession(id: number): void {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(id);
  }

  // --- Messages CRUD ---

  addMessage(message: {
    session_id: number;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    reasoning_content?: string | null;
    tool_calls?: any;
    tool_call_id?: string;
    token_input?: number;
    token_output?: number;
  }): number {
    const db = this.getDb();
    
    return runInTransaction(db, () => {
      const stmt = db.prepare(`
        INSERT INTO messages (session_id, role, content, reasoning_content, tool_calls, tool_call_id, token_input, token_output)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        message.session_id,
        message.role,
        message.content,
        message.reasoning_content || null,
        message.tool_calls ? JSON.stringify(message.tool_calls) : null,
        message.tool_call_id || null,
        message.token_input || 0,
        message.token_output || 0
      ) as { lastInsertRowid: number | bigint };

      // Bump session updated_at timestamp on new message
      db.prepare("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(message.session_id);

      return Number(result.lastInsertRowid);
    });
  }

  getMessages(sessionId: number): Message[] {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC").all(sessionId) as unknown as MessageRow[];
    return rows.map(r => this.mapMessageRow(r));
  }

  private mapSessionRow(row: SessionRow): Session {
    return {
      id: row.id,
      title: row.title,
      provider_id: row.provider_id || undefined,
      model_id: row.model_id || undefined,
      agent_id: row.agent_id || undefined,
      workspace_id: row.workspace_id || undefined,
      summary: row.summary || undefined,
      favorite: row.favorite === 1,
      archived: row.archived === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapMessageRow(row: MessageRow): Message {
    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role as 'system' | 'user' | 'assistant' | 'tool',
      content: row.content,
      reasoning_content: row.reasoning_content || undefined,
      tool_calls: row.tool_calls || undefined,
      tool_call_id: row.tool_call_id || undefined,
      token_input: row.token_input,
      token_output: row.token_output,
      created_at: row.created_at
    };
  }
}
