import { eventBus } from '../core/events.js';
import { PermissionRepository } from '../database/repositories/permissionRepository.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class ToolManager {
  private static permissionRepo = new PermissionRepository();
  private static registry: Map<string, { definition: ToolDefinition; execute: (args: any) => Promise<any> }> = new Map();

  static registerTool(definition: ToolDefinition, execute: (args: any) => Promise<any>) {
    this.registry.set(definition.name, { definition, execute });
  }

  static getToolSchemas(): any[] {
    const schemas: any[] = [];
    this.registry.forEach(({ definition }) => {
      schemas.push({
        type: 'function',
        function: {
          name: definition.name,
          description: definition.description,
          parameters: definition.parameters
        }
      });
    });
    return schemas;
  }

  /**
   * Executes a tool by name, running permission checks first.
   */
  static async executeTool(name: string, args: any): Promise<any> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered.`);
    }

    // 1. Permission check
    const permitted = await this.verifyPermission(name, args);
    if (!permitted) {
      throw new Error(`Permission denied: execution of tool "${name}" was rejected by the user.`);
    }

    const startTime = Date.now();
    eventBus.emit('tool:started', { toolName: name, args });

    try {
      const result = await tool.execute(args);
      const duration = Date.now() - startTime;
      eventBus.emit('tool:finished', { toolName: name, result, duration });
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown execution error';
      eventBus.emit('tool:failed', { toolName: name, error: errorMsg, duration });
      throw error;
    }
  }

  /**
   * Verifies if a tool has permission to execute based on active policies.
   */
  private static async verifyPermission(toolName: string, args: any): Promise<boolean> {
    const policy = this.permissionRepo.getPermission(toolName);

    if (policy === 'always_allow') {
      return true;
    }
    if (policy === 'deny') {
      return false;
    }

    // If policy is 'ask' or 'allow_once', prompt the user via Event Bus
    return new Promise<boolean>((resolve) => {
      // Trigger a permission:request event. App.tsx listens to this.
      eventBus.emit('tool:started', { toolName, args }); // Mark as active process
      
      const resolveCallback = (decision: 'always_allow' | 'allow_once' | 'deny') => {
        if (decision === 'always_allow') {
          this.permissionRepo.setPermission(toolName, 'always_allow');
          resolve(true);
        } else if (decision === 'allow_once') {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      // We wrap the permission resolver in a custom app event
      // We broadcast it via eventBus to let App.tsx render the modal dialog
      (eventBus as any).emit('permission:request', {
        toolName,
        args,
        resolve: resolveCallback
      });
    });
  }
}
