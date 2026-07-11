import { EventEmitter } from 'events';

// Define the shape of all event payloads in the application for type safety
export interface AppEventPayloads {
  'app:start': void;
  'app:exit': void;
  
  'provider:changed': { providerId: number; name: string };
  'provider:updated': { providerId: number };
  
  'model:changed': { modelId: string; providerId: number };
  'agent:changed': { agentName: string };
  
  'session:created': { sessionId: number; title: string };
  'session:loaded': { sessionId: number };
  'session:updated': { sessionId: number };
  'session:deleted': { sessionId: number };
  
  'message:sent': { sessionId: number; role: string; content: string };
  'message:received': { sessionId: number; role: string; content: string };
  
  'tool:started': { toolName: string; args: Record<string, any> };
  'tool:finished': { toolName: string; result: any; duration: number };
  'tool:failed': { toolName: string; error: string; duration: number };
  'permission:request': { toolName: string; args: Record<string, any>; resolve: (val: 'always_allow' | 'allow_once' | 'deny') => void };
  
  'stream:started': { sessionId: number; model: string };
  'stream:token': { token: string; reasoningToken?: string };
  'stream:finished': { fullText: string; fullReasoning?: string; tokensCount: number };
  
  'workspace:changed': { path: string };
  'workspace:scanned': { path: string; fileCount: number };
  'question:pending': { question: string; options?: string[] };
  'question:request': { question: string; options: string[]; resolve: (answer: string) => void };
}

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Set max listeners to avoid memory leak warnings during extensive plugin loads
    this.emitter.setMaxListeners(100);
  }

  // Publish an event with type checking
  emit<K extends keyof AppEventPayloads>(event: K, payload: AppEventPayloads[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  // Subscribe to an event with type checking
  on<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  // Subscribe once with type checking
  once<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this {
    this.emitter.once(event, listener);
    return this;
  }

  // Unsubscribe with type checking
  off<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  // Remove all listeners for a specific event
  removeAllListeners<K extends keyof AppEventPayloads>(event?: K): this {
    this.emitter.removeAllListeners(event);
    return this;
  }
}

// Export a single global instance of the Event Bus
export const eventBus = new TypedEventBus();
