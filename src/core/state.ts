import { eventBus } from './events.js';

export interface AppState {
  currentScreen: 'home' | 'chat' | 'providers' | 'models' | 'settings' | 'history' | 'mcp' | 'permissions';
  activeProviderId: number | null;
  activeModelId: string | null;
  activeAgentId: number | null;
  activeSessionId: number | null;
  activeWorkspaceId: number | null;
  workspacePath: string;
  gitBranch: string;
  contextUsagePercent: number;
  mcpCount: number;
  isStreaming: boolean;
  streamingText: string;
  streamingReasoning: string;
  streamingStartTime: number | null;
  activeToolName: string | null;
  errorMsg: string | null;
}

const defaultState: AppState = {
  currentScreen: 'home',
  activeProviderId: null,
  activeModelId: null,
  activeAgentId: null,
  activeSessionId: null,
  activeWorkspaceId: null,
  workspacePath: process.cwd(),
  gitBranch: '',
  contextUsagePercent: 0,
  mcpCount: 0,
  isStreaming: false,
  streamingText: '',
  streamingReasoning: '',
  streamingStartTime: null,
  activeToolName: null,
  errorMsg: null
};

class StateManager {
  private state: AppState = { ...defaultState };
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    // Listen to events and update state dynamically
    eventBus.on('provider:changed', (payload) => {
      this.setState({ activeProviderId: payload.providerId });
    });

    eventBus.on('model:changed', (payload) => {
      this.setState({ activeModelId: payload.modelId, activeProviderId: payload.providerId });
    });

    eventBus.on('session:loaded', (payload) => {
      this.setState({ activeSessionId: payload.sessionId, currentScreen: 'chat' });
    });

    eventBus.on('tool:started', (payload) => {
      this.setState({ activeToolName: payload.toolName });
    });

    eventBus.on('tool:finished', () => {
      this.setState({ activeToolName: null });
    });

    eventBus.on('tool:failed', () => {
      this.setState({ activeToolName: null });
    });

    eventBus.on('stream:started', () => {
      this.setState({ isStreaming: true, streamingText: '', streamingReasoning: '', streamingStartTime: Date.now() });
    });

    // stream:token is handled locally by StreamingResponse component to prevent full-app re-renders

    eventBus.on('stream:finished', () => {
      this.setState({ isStreaming: false, streamingStartTime: null });
    });
  }

  // Get current state snapshot
  getState(): AppState {
    return { ...this.state };
  }

  // Set partial state and notify listeners
  setState(updates: Partial<AppState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Simple deep check (only trigger if values actually changed)
    let changed = false;
    for (const key of Object.keys(updates) as Array<keyof AppState>) {
      if (oldState[key] !== this.state[key]) {
        changed = true;
        break;
      }
    }

    if (changed) {
      this.listeners.forEach((listener) => listener(this.state));
    }
  }

  // Subscribe to state changes (useful for React hook integration)
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Reset state to defaults
  reset(): void {
    this.setState({ ...defaultState });
  }
}

export const stateManager = new StateManager();
