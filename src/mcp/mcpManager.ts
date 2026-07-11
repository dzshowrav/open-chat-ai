import { spawn, ChildProcess } from 'child_process';
import { initDatabase } from '../database/connection.js';
import { ToolManager } from '../tools/toolManager.js';

interface McpServerConfig {
  id: number;
  name: string;
  command: string;
  arguments: string[];
}

export class McpManager {
  private static activeServers: Map<string, { process: ChildProcess; idCounter: number; pendingRequests: Map<number, (res: any) => void> }> = new Map();

  /**
   * Initializes and connects to all auto-connect enabled MCP servers.
   */
  static async init(): Promise<void> {
    const db = initDatabase();
    try {
      const servers = db.prepare("SELECT * FROM mcp_servers WHERE enabled = 1 AND auto_connect = 1").all() as any[];
      for (const row of servers) {
        let args: string[] = [];
        try {
          args = row.arguments ? JSON.parse(row.arguments) : [];
        } catch {
          args = [];
        }
        
        await this.connectServer({
          id: row.id,
          name: row.name,
          command: row.command,
          arguments: args
        });
      }
    } catch (err) {
      console.error('Failed to load MCP servers from database:', err);
    }
  }

  /**
   * Spawns an MCP server process over stdio transport and initializes it.
   */
  static async connectServer(config: McpServerConfig): Promise<void> {
    if (this.activeServers.has(config.name)) {
      return;
    }

    try {
      const proc = spawn(config.command, config.arguments, {
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const serverState = {
        process: proc,
        idCounter: 1,
        pendingRequests: new Map<number, (res: any) => void>()
      };

      this.activeServers.set(config.name, serverState);

      // Handle JSON-RPC stream outputs
      let buffer = '';
      proc.stdout?.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          try {
            const response = JSON.parse(cleanLine);
            if (response.id !== undefined) {
              const resolver = serverState.pendingRequests.get(response.id);
              if (resolver) {
                resolver(response);
                serverState.pendingRequests.delete(response.id);
              }
            }
          } catch {
            // Ignore non-json or malformed outputs
          }
        }
      });

      proc.on('close', () => {
        this.activeServers.delete(config.name);
      });

      // 1. Send MCP Protocol handshake initialization request
      await this.sendJsonRpc(config.name, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'OpenChat CLI', version: '1.0' }
      });

      // 2. Query server for exposed tool capabilities list
      const toolsResult = await this.sendJsonRpc(config.name, 'tools/list', {});
      if (toolsResult.result && Array.isArray(toolsResult.result.tools)) {
        for (const mcpTool of toolsResult.result.tools) {
          this.registerMcpTool(config.name, mcpTool);
        }
      }
    } catch (err: any) {
      console.error(`Failed to connect to MCP server "${config.name}":`, err.message);
    }
  }

  /**
   * Helper to write JSON-RPC payloads to process stdin
   */
  private static sendJsonRpc(serverName: string, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const server = this.activeServers.get(serverName);
      if (!server) {
        return reject(new Error(`Server "${serverName}" is not connected.`));
      }

      const id = server.idCounter++;
      const requestPayload = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };

      server.pendingRequests.set(id, resolve);
      
      try {
        server.process.stdin?.write(JSON.stringify(requestPayload) + '\n');
      } catch (err) {
        server.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Registers discovered tool namespaced to prevent workspace conflicts
   */
  private static registerMcpTool(serverName: string, mcpTool: any) {
    const namespacedName = `${serverName}_${mcpTool.name}`;
    
    ToolManager.registerTool({
      name: namespacedName,
      description: `[MCP: ${serverName}] ${mcpTool.description || ''}`,
      parameters: mcpTool.inputSchema || { type: 'object', properties: {} }
    }, async (args) => {
      const result = await this.sendJsonRpc(serverName, 'tools/call', {
        name: mcpTool.name,
        arguments: args
      });
      
      if (result.error) {
        throw new Error(`MCP Tool error: ${result.error.message || JSON.stringify(result.error)}`);
      }
      
      return result.result?.content || result.result || 'Success';
    });
  }

  /**
   * Terminates subprocesses cleanly at shutdown
   */
  static disconnectAll(): void {
    this.activeServers.forEach((server) => {
      server.process.kill();
    });
    this.activeServers.clear();
  }
}
export default McpManager;
