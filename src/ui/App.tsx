import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { stateManager, AppState } from '../core/state.js';
import { AppEngine } from '../core/engine.js';
import { eventBus } from '../core/events.js';
import { themeManager } from './theme/themeManager.js';
import { StatusBar } from './components/StatusBar.js';
import { terminateMarkdownWorker } from './components/MarkdownWorker.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ChatScreen } from './screens/ChatScreen.js';
import { CommandPalette } from './components/CommandPalette.js';
import { 
  ProviderListDialog,
  ProviderDialog, 
  AddModelDialog, 
  ModelSwitcherDialog, 
  SettingsDialog, 
  PermissionsPromptDialog,
  AgentSwitcherDialog,
  HistorySwitcherDialog,
  SkillsListDialog,
  McpListDialog,
  ToolsListDialog,
  ToolPermissionsDialog,
  QuestionDialog,
  BackupRestoreDialog,
  ThemeSwitcherDialog
} from './screens/Dialogs.js';
import { ProviderRepository } from '../database/repositories/providerRepository.js';
import { ModelRepository } from '../database/repositories/modelRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { SettingRepository } from '../database/repositories/settingRepository.js';
import { AgentRepository } from '../database/repositories/agentRepository.js';
import { SkillsManager, Skill } from '../skills/skillsManager.js';
import { initDatabase, runInTransaction } from '../database/connection.js';
import { Message, Provider, Model, Agent, Session } from '../types/index.js';
import { ApiEngine } from '../api/apiEngine.js';
import { ContextBuilder } from '../core/contextBuilder.js';
import { ToolManager } from '../tools/toolManager.js';

const renderPromptPreview = (text: string) => {
  if (!text) {
    return <Text color="gray">Ask AI anything... (Type / for commands)</Text>;
  }

  const lines = text.split('\n');
  const isMultiLine = lines.length > 1;
  const isVeryLong = text.length > 300;

  if (isMultiLine || isVeryLong) {
    const linesCount = lines.length;
    const charCount = text.length;
    const firstLine = lines[0].trim();
    const previewText = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
    return (
      <Text color="cyan" bold>
        [pasted text: <Text color="white" italic>"{previewText}"</Text> | +{linesCount - 1} lines, {charCount} chars]
      </Text>
    );
  }

  return <Text wrap="wrap">{text}</Text>;
};

export const App: React.FC = () => {
  const { exit } = useApp();
  const theme = themeManager.getCurrentTheme();
  const { stdout } = useStdout();
  const rows = stdout?.rows || 24;
  const isMobile = rows < 18;

  const activeAbortController = React.useRef<AbortController | null>(null);
  const lastEscPress = React.useRef<number>(0);

  // Instantiate Repositories
  const providerRepo = new ProviderRepository();
  const modelRepo = new ModelRepository();
  const sessionRepo = new SessionRepository();
  const settingRepo = new SettingRepository();
  const agentRepo = new AgentRepository();

  // Sync stateManager State with local React State
  const [state, setState] = useState<AppState>(stateManager.getState());
  const [prompt, setPrompt] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Dialog-specific states
  const [activeDialog, setActiveDialog] = useState<'none' | 'provider-form' | 'provider-list' | 'model-form' | 'model-switcher' | 'settings' | 'permissions' | 'agent-switcher' | 'history-switcher' | 'skills-list' | 'mcp-list' | 'tools-list' | 'tool-permissions' | 'question-prompt' | 'backup-restore' | 'themes-switcher'>('none');
  const [backupRestoreMode, setBackupRestoreMode] = useState<'backup' | 'restore'>('backup');
  const [availableModels, setAvailableModels] = useState<Array<Model & { provider_name: string }>>([]);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableMcpServers, setAvailableMcpServers] = useState<any[]>([]);

  const [pendingPermissionRequest, setPendingPermissionRequest] = useState<{
    toolName: string;
    args: Record<string, any>;
    resolve: (val: 'always_allow' | 'allow_once' | 'deny') => void;
  } | null>(null);

  const [pendingQuestionRequest, setPendingQuestionRequest] = useState<{
    question: string;
    options: string[];
    resolve: (answer: string) => void;
  } | null>(null);

  useEffect(() => {
    // Subscribe to central state modifications
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(newState);
    });

    // Stream tokens are now handled locally in ChatScreen's StreamingResponse component

    const handleStreamFinished = () => {
      const activeId = stateManager.getState().activeSessionId;
      if (activeId) {
        setMessages(sessionRepo.getMessages(activeId));
      }
    };

    const handleSessionLoaded = (payload: { sessionId: number }) => {
      setMessages(sessionRepo.getMessages(payload.sessionId));
    };

    const handleToolStarted = () => {
      setState(stateManager.getState());
    };

    const handlePermissionRequest = (req: {
      toolName: string;
      args: Record<string, any>;
      resolve: (val: 'always_allow' | 'allow_once' | 'deny') => void;
    }) => {
      setPendingPermissionRequest(req);
      setActiveDialog('permissions');
    };

    const handleQuestionRequest = (req: {
      question: string;
      options: string[];
      resolve: (answer: string) => void;
    }) => {
      setPendingQuestionRequest(req);
      setActiveDialog('question-prompt');
    };

    eventBus.on('stream:finished', handleStreamFinished);
    eventBus.on('session:loaded', handleSessionLoaded);
    eventBus.on('tool:started', handleToolStarted);
    eventBus.on('permission:request', handlePermissionRequest);
    eventBus.on('question:request', handleQuestionRequest);

    return () => {
      unsubscribe();
      eventBus.off('stream:finished', handleStreamFinished);
      eventBus.off('session:loaded', handleSessionLoaded);
      eventBus.off('tool:started', handleToolStarted);
      eventBus.off('permission:request', handlePermissionRequest);
      eventBus.off('question:request', handleQuestionRequest);
    };
  }, []);

  // Main UI Keyboard listener
  useInput((input: string, key: any) => {
    if (state.errorMsg) {
      if (key.escape || key.return) stateManager.setState({ errorMsg: null });
      return;
    }

    if (key.escape) {
      const now = Date.now();
      const diff = now - lastEscPress.current;
      lastEscPress.current = now;

      if (diff <= 1000) {
        // Double ESC pressed! Abort active stream and close dialogs
        if (state.isStreaming) {
          if (activeAbortController.current) {
            activeAbortController.current.abort();
            activeAbortController.current = null;
          }
          eventBus.emit('stream:finished', { fullText: state.streamingText || '', tokensCount: 0 });
          stateManager.setState({ isStreaming: false, streamingStartTime: null });
        }
        if (activeDialog !== 'none') {
          setActiveDialog('none');
        }
        return;
      }
    }

    if (activeDialog !== 'none') return;

    if (key.ctrl && input === 'c') {
      if (state.isStreaming) {
        if (activeAbortController.current) {
          activeAbortController.current.abort();
          activeAbortController.current = null;
        }
        eventBus.emit('stream:finished', { fullText: state.streamingText || '', tokensCount: 0 });
        stateManager.setState({ isStreaming: false, streamingStartTime: null });
      }
      else {
        terminateMarkdownWorker();
        exit();
      }
      return;
    }

    if (key.ctrl && input === 'u') {
      setPrompt('');
      return;
    }

    if (key.ctrl && input === 'l') {
      // Clear terminal screen
      process.stdout.write('\x1b[2J\x1b[H');
      return;
    }

    if (key.ctrl && input === 'w') {
      // Delete last word (Ctrl+W)
      setPrompt(prev => {
        const trimmed = prev.trimEnd();
        const lastSpace = trimmed.lastIndexOf(' ');
        if (lastSpace === -1) {
          return '';
        }
        return prev.slice(0, lastSpace + 1);
      });
      return;
    }

    // Let CommandPalette handle these navigation/action keys completely
    if (showCommandPalette && (key.upArrow || key.downArrow || key.return || key.escape)) {
      return; 
    }

    // Ignore other navigation keys
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.tab) {
      return;
    }

    if (key.return) {
      if (key.shift || key.ctrl) {
        // Shift+Enter / Ctrl+Enter submits
        handlePromptSubmit();
      } else if (key.meta) {
        // Alt+Enter / Option+Enter inserts newline
        setPrompt(prev => prev + '\n');
      } else {
        // Standard Enter
        if (prompt.trim() === '') {
          return;
        }

        const hasNewlines = prompt.includes('\n');
        const endsWithNewline = prompt.endsWith('\n');

        // If it's a slash command, or a single-line message, submit immediately.
        // If it's already a multi-line message, Enter adds a newline, and a second Enter submits.
        if (prompt.startsWith('/') || !hasNewlines || endsWithNewline) {
          handlePromptSubmit();
        } else {
          setPrompt(prev => prev + '\n');
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      setPrompt(prev => {
        const next = prev.slice(0, -1);
        if (showCommandPalette && next === '') setShowCommandPalette(false);
        return next;
      });
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      if (prompt === '' && input === '/') {
        if (state.currentScreen === 'home') process.stdout.write('\x1b[2J\x1b[H');
        setShowCommandPalette(true);
      }
      const cleanInput = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      setPrompt(prev => prev + cleanInput);
    }
  });

  // Slash commands routing handler
  const handlePromptSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      executeSlashCommand(trimmed);
      setPrompt('');
      return;
    }

    // Standard User message chat run
    if (!state.activeProviderId || !state.activeModelId) {
      stateManager.setState({ errorMsg: 'Error: No active AI model or provider configured.' });
      setPrompt('');
      return;
    }

    let sessionId = state.activeSessionId;
    if (!sessionId) {
      // Create new session automatically on first message
      sessionId = sessionRepo.createSession({
        title: trimmed.slice(0, 30),
        provider_id: state.activeProviderId,
        model_id: Number(state.activeModelId), // Map back to key index
      });
      stateManager.setState({ activeSessionId: sessionId });
    }

    // Clear terminal before switching screens so HomeScreen doesn't persist
    if (state.currentScreen === 'home') {
      process.stdout.write('\x1b[2J\x1b[H');
    }
    stateManager.setState({ currentScreen: 'chat' });

    // Add user message to DB
    sessionRepo.addMessage({
      session_id: sessionId,
      role: 'user',
      content: trimmed
    });

    // Update screen history
    setMessages(sessionRepo.getMessages(sessionId));
    setPrompt('');

    // Trigger AI Chat call (Simulated completion trigger for validation)
    triggerAiCompletion(sessionId, trimmed);
  };

  const executeSlashCommand = (cmd: string) => {
    if (cmd === '/provider api') {
      setEditingProvider(undefined);
      setActiveDialog('provider-form');
    } else if (cmd === '/providers') {
      setAvailableProviders(providerRepo.listProviders());
      setActiveDialog('provider-list');
    } else if (cmd === '/add model') {
      const providers = providerRepo.listProviders();
      if (providers.length === 0) {
        stateManager.setState({ errorMsg: 'Error: No providers configured. Run /provider api first.' });
      } else {
        setActiveDialog('model-form');
      }
    } else if (cmd === '/all models') {
      // Load all models from DB
      const dbModels = modelRepo.listModels();
      const list = dbModels.map(m => {
        const prov = providerRepo.getProvider(m.provider_id);
        return {
          ...m,
          provider_name: prov?.name || 'Unknown'
        };
      });
      setAvailableModels(list);
      setActiveDialog('model-switcher');
    } else if (cmd === '/agents') {
      const list = agentRepo.listAgents();
      setAvailableAgents(list);
      setActiveDialog('agent-switcher');
    } else if (cmd === '/skills') {
      const list = SkillsManager.loadWorkspaceSkills();
      setAvailableSkills(list);
      setActiveDialog('skills-list');
    } else if (cmd === '/history') {
      const list = sessionRepo.listSessions();
      setAvailableSessions(list);
      setActiveDialog('history-switcher');
    } else if (cmd === '/mcp') {
      try {
        const db = initDatabase();
        const list = db.prepare("SELECT * FROM mcp_servers").all() as any[];
        setAvailableMcpServers(list);
        setActiveDialog('mcp-list');
      } catch (err: any) {
        stateManager.setState({ errorMsg: `Error loading MCP servers: ${err.message}` });
      }
    } else if (cmd === '/settings') {
      setActiveDialog('settings');
    } else if (cmd === '/tools') {
      setActiveDialog('tools-list');
    } else if (cmd === '/permissions') {
      setActiveDialog('tool-permissions');
    } else if (cmd === '/uninstall') {
      setActiveDialog('question-prompt');
      setPendingQuestionRequest({
        question: 'Are you sure you want to completely uninstall OpenChat AI from this system? This will delete all settings and history.',
        options: ['Yes, uninstall now', 'No, cancel'],
        resolve: async (answer) => {
          setPendingQuestionRequest(null);
          if (answer === 'Yes, uninstall now') {
            setActiveDialog('none');
            stateManager.setState({ activeToolName: 'Uninstalling OpenChat AI...' });
            
            const engine = new AppEngine();
            const success = await engine.uninstall();
            
            stateManager.setState({ activeToolName: null });
            if (success) {
              stateManager.setState({ errorMsg: 'Uninstallation complete. Goodbye!' });
              setTimeout(() => {
                exit();
                process.exit(0);
              }, 3000);
            } else {
              stateManager.setState({ errorMsg: 'Uninstallation failed! Please check your permissions or uninstall manually: npm uninstall -g openchat-ai' });
            }
          } else {
            setActiveDialog('none');
          }
        }
      });
    } else if (cmd === '/update latest') {
      setActiveDialog('question-prompt');
      setPendingQuestionRequest({
        question: state.isUpdateAvailable 
          ? `A new version (v${state.latestVersion}) is available. Do you want to update now?`
          : 'You are on the latest version. Do you want to force reinstall/update anyway?',
        options: ['Yes, update now', 'No, cancel'],
        resolve: async (answer) => {
          setPendingQuestionRequest(null);
          if (answer === 'Yes, update now') {
            setActiveDialog('none');
            stateManager.setState({ activeToolName: 'Updating OpenChat AI...' });
            
            const engine = new AppEngine();
            const result = await engine.updateToLatest();
            
            stateManager.setState({ activeToolName: null });
            if (result.success) {
              stateManager.setState({ errorMsg: 'Update successful! Please restart OpenChat AI to apply changes.' });
              setTimeout(() => {
                exit();
                process.exit(0);
              }, 3000);
            } else {
              stateManager.setState({ errorMsg: `Update failed: ${result.error || 'Please check your network connection.'}` });
            }
          } else {
            setActiveDialog('none');
          }
        }
      });
    } else if (cmd === '/backup' || cmd === '/restore' || cmd === '/backup & restore') {
      setBackupRestoreMode(cmd === '/restore' ? 'restore' : 'backup');
      setActiveDialog('backup-restore');
    } else if (cmd === '/themes') {
      setActiveDialog('themes-switcher');
    } else if (cmd === '/help') {
      stateManager.setState({ errorMsg: 'Slash commands: /update latest, /uninstall, /provider api, /add model, /all models, /agents, /skills, /history, /mcp, /tools, /permissions, /settings, /themes, /backup, /restore, /help, /exit' });
    } else if (cmd === '/exit') {
      terminateMarkdownWorker();
      exit();
      setTimeout(() => process.exit(0), 50);
    } else {
      stateManager.setState({ errorMsg: `Unknown command: ${cmd}` });
    }
  };

  // Live recursive agentic tool call loop
  const triggerAiCompletion = async (sessionId: number, userText: string) => {
    stateManager.setState({ isStreaming: true });

    try {
      const activeProviderId = state.activeProviderId;
      const activeModelId = state.activeModelId;
      if (!activeProviderId || !activeModelId) {
        throw new Error('Active provider or model not found. Please register a provider first.');
      }

      const provider = providerRepo.getProvider(activeProviderId);
      if (!provider) {
        throw new Error('Provider not found in database.');
      }

      const dbModel = modelRepo.listModels().find(m => m.model_id === activeModelId);
      const modelString = dbModel ? dbModel.model_id : activeModelId;

      let runCount = 0;
      const maxRuns = 6; // Safety recursion limit

      while (runCount < maxRuns) {
        runCount++;

        // 1. Build dynamic context system prompt
        const systemPrompt = ContextBuilder.buildSystemPrompt();

        // 2. Fetch messages from DB
        const dbMessages = sessionRepo.getMessages(sessionId);
        
        // 3. Compile messages for API payload
        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...dbMessages.map(m => {
            const msg: any = { role: m.role, content: m.content };
            if (m.tool_calls) {
              msg.tool_calls = typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls;
            }
            if (m.tool_call_id) {
              msg.tool_call_id = m.tool_call_id;
            }
            return msg;
          })
        ];

        // 4. Gather registered tool schemas
        const tools = ToolManager.getToolSchemas();

        // 5. Notify streaming interface started
        eventBus.emit('stream:started', { sessionId, model: modelString });

        let accumulatedContent = '';
        let accumulatedToolCalls: any[] = [];

        // Fetch streaming configuration from setting repo / state
        const useStreaming = state.isStreaming;

        // Initialize AbortController for this request
        const controller = new AbortController();
        activeAbortController.current = controller;

        // Run chat completion (handles both streaming token callbacks and tool results blocks)
        const response = await ApiEngine.chatCompletion({
          provider,
          model: modelString,
          messages: apiMessages,
          tools: tools.length > 0 ? tools : undefined,
          stream: useStreaming,
          signal: controller.signal
        });

        activeAbortController.current = null;

        accumulatedContent = response.content || '';
        accumulatedToolCalls = response.tool_calls || [];
        const accumulatedReasoning = response.reasoning_content || '';

        accumulatedToolCalls = accumulatedToolCalls.filter(tc => tc !== null && tc !== undefined);

        // 6. Handle agent action branches
        if (accumulatedToolCalls.length > 0) {
          // AI requested tool calls. Log assistant request to DB
          sessionRepo.addMessage({
            session_id: sessionId,
            role: 'assistant',
            content: accumulatedContent || null,
            reasoning_content: accumulatedReasoning || null,
            tool_calls: JSON.stringify(accumulatedToolCalls)
          });

          // Sync messages in the UI
          setMessages(sessionRepo.getMessages(sessionId));

          // Run each requested tool sequentially
          for (const tc of accumulatedToolCalls) {
            const toolName = tc.function.name;
            let toolArgs = {};
            try {
              let parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
              if (typeof parsed === 'string') parsed = JSON.parse(parsed);
              toolArgs = parsed;
            } catch {
              toolArgs = {};
            }
            
            let niceName = toolName.replace(/_file|_process/g, '');
            niceName = niceName.charAt(0).toUpperCase() + niceName.slice(1);
            const targetStr = String((toolArgs as any).path || (toolArgs as any).url || (toolArgs as any).query || (toolArgs as any).command || '');
            let activeTitle = niceName;
            if (targetStr) {
               const shortTarget = targetStr.length > 50 ? targetStr.slice(0, 20) + '...' + targetStr.slice(-25) : targetStr;
               activeTitle = `${niceName}(${shortTarget})`;
            }

            eventBus.emit('tool:started', { toolName: activeTitle, args: toolArgs });
            let toolOutput = '';
            try {
              const res = await ToolManager.executeTool(toolName, toolArgs);
              toolOutput = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
            } catch (err: any) {
              toolOutput = `Error: ${err.message || String(err)}`;
            }

            // Save tool output as a tool-role message
            sessionRepo.addMessage({
              session_id: sessionId,
              role: 'tool',
              content: toolOutput,
              tool_call_id: tc.id
            });
          }

          // Sync UI history list
          setMessages(sessionRepo.getMessages(sessionId));

          // Continue back to loop for final response compilation
          continue;
        }

        // Final text response received
        if (accumulatedContent || accumulatedReasoning) {
          sessionRepo.addMessage({
            session_id: sessionId,
            role: 'assistant',
            content: accumulatedContent,
            reasoning_content: accumulatedReasoning || null
          });
        }

        eventBus.emit('stream:finished', { fullText: accumulatedContent, fullReasoning: accumulatedReasoning, tokensCount: 0 });
        break;
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'The user aborted a request.' || err.message?.includes('aborted')) {
        // Silently catch and consume user-triggered aborts
        eventBus.emit('stream:finished', { fullText: '', tokensCount: 0 });
        return;
      }
      stateManager.setState({ errorMsg: `AI Error: ${err.message || String(err)}` });
      eventBus.emit('stream:finished', { fullText: '', tokensCount: 0 });
    } finally {
      stateManager.setState({ isStreaming: false });
      activeAbortController.current = null;
    }
  };

  // Dialog callback submissions
  const handleProviderSubmit = (providerData: { name: string; base_url: string; api_key: string; description?: string }) => {
    let id: number;
    if (editingProvider?.id) {
      providerRepo.updateProvider(editingProvider.id, providerData);
      id = editingProvider.id;
    } else {
      id = providerRepo.addProvider({
        ...providerData,
        status: 'unknown',
        latency: 0
      });
    }
    
    // Automatically make it active if none is active
    if (!state.activeProviderId || editingProvider?.id === state.activeProviderId) {
      stateManager.setState({ activeProviderId: id });
    }
    
    setEditingProvider(undefined);
    setActiveDialog('none');
  };

  const handleModelSubmit = (modelData: {
    model_id: string;
    display_name: string;
    provider_id: number;
    description: string;
    category: string;
    context_window: number;
    max_output: number;
  }) => {
    try {
      modelRepo.addModel({
        model_id: modelData.model_id,
        display_name: modelData.display_name,
        provider_id: modelData.provider_id,
        description: modelData.description || undefined,
        category: modelData.category || 'coding',
        supports_streaming: true,
        supports_tools: true,
        supports_reasoning: modelData.category === 'reasoning',
        supports_vision: modelData.category === 'vision',
        supports_json: true,
        supports_audio: false,
        supports_embedding: false,
        max_context: modelData.context_window || 128000,
        max_output: modelData.max_output || 4096
      });
      setActiveDialog('none');
      stateManager.setState({ activeModelId: modelData.model_id });
    } catch (err: any) {
      stateManager.setState({ errorMsg: `Database Error: ${err.message}` });
    }
  };

  const handleModelSelect = (modelId: string, providerId: number) => {
    stateManager.setState({ activeModelId: modelId, activeProviderId: providerId });
    eventBus.emit('model:changed', { modelId, providerId });
    setActiveDialog('none');
  };

  const handleSettingsSave = (themeId: string, streaming: boolean) => {
    themeManager.setTheme(themeId);
    settingRepo.setSetting('streaming', { enabled: streaming });
    stateManager.setState({ isStreaming: streaming });
    setActiveDialog('none');
  };

  const handleThemeSelect = (themeId: string) => {
    themeManager.setTheme(themeId);
    stateManager.setState({ activeThemeId: themeId } as any);
    setActiveDialog('none');
  };

  const handleAgentSelect = (agentId: string) => {
    const agent = agentRepo.getAgent(Number(agentId));
    if (agent) {
      stateManager.setState({ activeAgentId: Number(agentId) });
      eventBus.emit('agent:changed', { agentName: agent.name });
    }
    setActiveDialog('none');
  };

  const handleSessionSelect = (sessionId: number) => {
    process.stdout.write('\x1b[2J\x1b[H');
    stateManager.setState({ activeSessionId: sessionId, currentScreen: 'chat' });
    setMessages(sessionRepo.getMessages(sessionId));
    setActiveDialog('none');
  };

  const handleBackupRestoreSubmit = async (mode: 'backup' | 'restore', filePath: string) => {
    setActiveDialog('none');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    // Clean and resolve path
    let cleanedPath = filePath.trim();

    // Remove command prefix like 'cd ' (case-insensitive)
    if (cleanedPath.toLowerCase().startsWith('cd ')) {
      cleanedPath = cleanedPath.slice(3).trim();
    }

    // Strip wrapping quotes
    if ((cleanedPath.startsWith('"') && cleanedPath.endsWith('"')) || 
        (cleanedPath.startsWith("'") && cleanedPath.endsWith("'"))) {
      cleanedPath = cleanedPath.slice(1, -1).trim();
    }

    // Resolve home directory
    if (cleanedPath.startsWith('~')) {
      cleanedPath = path.join(os.homedir(), cleanedPath.slice(1));
    } else if (!path.isAbsolute(cleanedPath)) {
      // If it starts with storage/ in Termux environment, default to resolving in home dir
      if (cleanedPath.startsWith('storage/') || cleanedPath.startsWith('storage\\')) {
        cleanedPath = path.join(os.homedir(), cleanedPath);
      } else {
        cleanedPath = path.resolve(process.cwd(), cleanedPath);
      }
    }
    
    if (mode === 'backup') {
      try {
        const providers = providerRepo.listProviders();
        const models = modelRepo.listModels();
        const data = {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          providers,
          models
        };
        
        // Ensure parent directory exists
        const dirName = path.dirname(cleanedPath);
        if (!fs.existsSync(dirName)) {
          fs.mkdirSync(dirName, { recursive: true });
        }
        
        fs.writeFileSync(cleanedPath, JSON.stringify(data, null, 2), 'utf-8');
        stateManager.setState({ errorMsg: `Backup saved successfully to: ${cleanedPath}` });
      } catch (err: any) {
        stateManager.setState({ errorMsg: `Backup failed: ${err.message}` });
      }
    } else {
      try {
        if (!fs.existsSync(cleanedPath)) {
          stateManager.setState({ errorMsg: `Restore failed: File not found at ${cleanedPath}` });
          return;
        }
        const raw = fs.readFileSync(cleanedPath, 'utf-8');
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.providers)) {
          stateManager.setState({ errorMsg: 'Restore failed: Invalid backup file format.' });
          return;
        }

        const db = initDatabase();
        runInTransaction(db, () => {
          const providerIdMap: Record<number, number> = {};
          
          for (const prov of data.providers) {
            const existing = providerRepo.getProviderByName(prov.name);
            let provId: number;
            if (existing) {
              provId = existing.id!;
              providerRepo.updateProvider(provId, {
                base_url: prov.base_url,
                api_key: prov.api_key,
                description: prov.description,
                status: prov.status,
                latency: prov.latency
              });
            } else {
              provId = providerRepo.addProvider({
                name: prov.name,
                base_url: prov.base_url,
                api_key: prov.api_key,
                description: prov.description,
                status: prov.status,
                latency: prov.latency
              });
            }
            providerIdMap[prov.id] = provId;
          }

          if (Array.isArray(data.models)) {
            for (const model of data.models) {
              const newProvId = providerIdMap[model.provider_id];
              if (!newProvId) continue;
              
              const existing = modelRepo.getModelByStringId(newProvId, model.model_id);
              if (existing) {
                modelRepo.updateModel(existing.id!, {
                  display_name: model.display_name,
                  description: model.description,
                  category: model.category,
                  supports_streaming: model.supports_streaming,
                  supports_tools: model.supports_tools,
                  supports_reasoning: model.supports_reasoning,
                  supports_vision: model.supports_vision,
                  supports_json: model.supports_json,
                  supports_audio: model.supports_audio,
                  supports_embedding: model.supports_embedding,
                  max_context: model.max_context,
                  max_output: model.max_output,
                  enabled: model.enabled
                });
              } else {
                modelRepo.addModel({
                  provider_id: newProvId,
                  model_id: model.model_id,
                  display_name: model.display_name,
                  description: model.description,
                  category: model.category,
                  supports_streaming: model.supports_streaming,
                  supports_tools: model.supports_tools,
                  supports_reasoning: model.supports_reasoning,
                  supports_vision: model.supports_vision,
                  supports_json: model.supports_json,
                  supports_audio: model.supports_audio,
                  supports_embedding: model.supports_embedding,
                  max_context: model.max_context,
                  max_output: model.max_output
                });
              }
            }
          }
        });

        // Trigger reload of default/active model
        const defaultProvider = db.prepare("SELECT id FROM providers WHERE is_default = 1").get() as { id: number } | undefined;
        if (defaultProvider) {
          stateManager.setState({ activeProviderId: defaultProvider.id });
          const activeModel = db.prepare("SELECT model_id FROM models WHERE provider_id = ? AND enabled = 1 ORDER BY favorite DESC, id ASC LIMIT 1").get(defaultProvider.id) as { model_id: string } | undefined;
          if (activeModel) {
            stateManager.setState({ activeModelId: activeModel.model_id });
            eventBus.emit('model:changed', { modelId: activeModel.model_id, providerId: defaultProvider.id });
          }
        }
        
        stateManager.setState({ errorMsg: 'Restore completed successfully!' });
      } catch (err: any) {
        stateManager.setState({ errorMsg: `Restore failed: ${err.message}` });
      }
    }
  };

  return (
    <Box flexDirection="column" width="100%" paddingX={isMobile ? 0 : 1} paddingY={isMobile ? 0 : 1}>
      <Box flexDirection="column" flexGrow={1}>
        {state.currentScreen === 'home' && !showCommandPalette && activeDialog === 'none' && <HomeScreen state={state} />}
        {state.currentScreen === 'chat' && <ChatScreen key={`chat-session-${state.activeSessionId || 'default'}`} messages={messages} state={state} />}

        {/* Dialog Overlays */}
        {activeDialog === 'provider-form' && (
          <Box justifyContent="center" marginY={1}>
            <ProviderDialog 
              initialProvider={editingProvider}
              onSubmit={handleProviderSubmit} 
              onClose={() => {
                setEditingProvider(undefined);
                setActiveDialog('none');
              }} 
            />
          </Box>
        )}

        {activeDialog === 'provider-list' && (
          <Box justifyContent="center" marginY={1}>
            <ProviderListDialog 
              providers={availableProviders} 
              onSelect={(providerId: number) => {
                const prov = providerRepo.getProvider(providerId);
                setEditingProvider(prov);
                setActiveDialog('provider-form');
              }} 
              onClose={() => setActiveDialog('none')} 
            />
          </Box>
        )}

        {activeDialog === 'model-form' && (
          <Box justifyContent="center" marginY={1}>
            <AddModelDialog 
              providers={providerRepo.listProviders()}
              onSubmit={handleModelSubmit} 
              onClose={() => setActiveDialog('none')} 
            />
          </Box>
        )}

        {activeDialog === 'model-switcher' && (
          <Box justifyContent="center" marginY={1}>
            <ModelSwitcherDialog 
              models={availableModels} 
              onSelect={handleModelSelect} 
              onClose={() => setActiveDialog('none')} 
            />
          </Box>
        )}

        {activeDialog === 'settings' && (
          <Box justifyContent="center" marginY={1}>
            <SettingsDialog 
              currentThemeId={theme.id} 
              currentStreaming={state.isStreaming} 
              onSave={handleSettingsSave} 
              onClose={() => setActiveDialog('none')} 
            />
          </Box>
        )}

        {activeDialog === 'permissions' && pendingPermissionRequest && (
          <Box justifyContent="center" marginY={1}>
            <PermissionsPromptDialog
              toolName={pendingPermissionRequest.toolName}
              args={pendingPermissionRequest.args}
              onAllowOnce={() => {
                pendingPermissionRequest.resolve('allow_once');
                setPendingPermissionRequest(null);
                setActiveDialog('none');
              }}
              onAlwaysAllow={() => {
                pendingPermissionRequest.resolve('always_allow');
                setPendingPermissionRequest(null);
                setActiveDialog('none');
              }}
              onDeny={() => {
                pendingPermissionRequest.resolve('deny');
                setPendingPermissionRequest(null);
                setActiveDialog('none');
              }}
            />
          </Box>
        )}

        {activeDialog === 'question-prompt' && pendingQuestionRequest && (
          <Box justifyContent="center" marginY={1}>
            <QuestionDialog
              question={pendingQuestionRequest.question}
              options={pendingQuestionRequest.options}
              onSubmit={(answer) => {
                pendingQuestionRequest.resolve(answer);
                setPendingQuestionRequest(null);
                setActiveDialog('none');
              }}
            />
          </Box>
        )}

        {activeDialog === 'agent-switcher' && (
          <Box justifyContent="center" marginY={1}>
            <AgentSwitcherDialog 
              agents={availableAgents}
              activeAgentId={state.activeAgentId}
              onSelect={handleAgentSelect}
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'history-switcher' && (
          <Box justifyContent="center" marginY={1}>
            <HistorySwitcherDialog 
              sessions={availableSessions}
              onSelect={handleSessionSelect}
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'skills-list' && (
          <Box justifyContent="center" marginY={1}>
            <SkillsListDialog 
              skills={availableSkills}
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'mcp-list' && (
          <Box justifyContent="center" marginY={1}>
            <McpListDialog 
              servers={availableMcpServers}
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'tools-list' && (
          <Box justifyContent="center" marginY={1}>
            <ToolsListDialog
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'tool-permissions' && (
          <Box justifyContent="center" marginY={1}>
            <ToolPermissionsDialog
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'backup-restore' && (
          <Box justifyContent="center" marginY={1}>
            <BackupRestoreDialog
              initialMode={backupRestoreMode}
              onSubmit={handleBackupRestoreSubmit}
              onClose={() => setActiveDialog('none')}
            />
          </Box>
        )}

        {activeDialog === 'themes-switcher' && (
          <Box justifyContent="center" marginY={1}>
            <ThemeSwitcherDialog
              onPreview={(themeId) => {
                themeManager.setTheme(themeId);
                stateManager.setState({ activeThemeId: themeId } as any);
              }}
              onSelect={handleThemeSelect}
              onClose={(revertThemeId) => {
                themeManager.setTheme(revertThemeId);
                stateManager.setState({ activeThemeId: revertThemeId } as any);
                setActiveDialog('none');
              }}
            />
          </Box>
        )}

        {/* Command Palette Overlay */}
        {showCommandPalette && (
          <Box justifyContent="center" marginY={1}>
            <CommandPalette 
              state={state}
              query={prompt.startsWith('/') ? prompt.slice(1) : prompt} 
              onSelect={(cmd) => {
                setShowCommandPalette(false);
                setPrompt('');
                executeSlashCommand(cmd);
              }}
              onClose={() => {
                setShowCommandPalette(false);
                setPrompt('');
              }}
            />
          </Box>
        )}

        {/* Error notification messages */}
        {state.errorMsg && (
          <Box marginX={2} marginY={1} borderStyle="single" borderColor="red" paddingX={1}>
            <Text color="red" bold>{state.errorMsg}</Text>
          </Box>
        )}
      </Box>

      {/* Input prompt area */}
      <Box flexDirection="column">
        {isMobile ? (
          <Box flexDirection="column">
            <Text color="gray">{"─".repeat(stdout?.columns || 80)}</Text>
            <Box flexDirection="row" paddingX={1} marginY={0}>
              <Text color={theme.accentColor} bold>&gt; </Text>
              {renderPromptPreview(prompt)}
              <Text color="cyan">█</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="row" borderStyle="single" borderColor={theme.accentColor} paddingX={1} marginY={0.5}>
            <Text color={theme.accentColor} bold>&gt; </Text>
            {renderPromptPreview(prompt)}
            <Text color="cyan">█</Text>
          </Box>
        )}
        <StatusBar state={state} />
      </Box>
    </Box>
  );
};
export default App;
