import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { stateManager, AppState } from '../core/state.js';
import { AppEngine } from '../core/engine.js';
import { eventBus } from '../core/events.js';
import { themeManager } from './theme/themeManager.js';
import { StatusBar } from './components/StatusBar.js';
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
  QuestionDialog
} from './screens/Dialogs.js';
import { ProviderRepository } from '../database/repositories/providerRepository.js';
import { ModelRepository } from '../database/repositories/modelRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { SettingRepository } from '../database/repositories/settingRepository.js';
import { AgentRepository } from '../database/repositories/agentRepository.js';
import { SkillsManager, Skill } from '../skills/skillsManager.js';
import { initDatabase } from '../database/connection.js';
import { Message, Provider, Model, Agent, Session } from '../types/index.js';
import { ApiEngine } from '../api/apiEngine.js';
import { ContextBuilder } from '../core/contextBuilder.js';
import { ToolManager } from '../tools/toolManager.js';

export const App: React.FC = () => {
  const { exit } = useApp();
  const theme = themeManager.getCurrentTheme();

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
  const [activeDialog, setActiveDialog] = useState<'none' | 'provider-form' | 'provider-list' | 'model-form' | 'model-switcher' | 'settings' | 'permissions' | 'agent-switcher' | 'history-switcher' | 'skills-list' | 'mcp-list' | 'tools-list' | 'tool-permissions' | 'question-prompt'>('none');
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
      else exit();
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
      handlePromptSubmit();
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

    if (input) {
      if (prompt === '' && input === '/') {
        if (state.currentScreen === 'home') process.stdout.write('\x1b[2J\x1b[H');
        setShowCommandPalette(true);
      }
      setPrompt(prev => prev + input);
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
            const success = await engine.updateToLatest();
            
            stateManager.setState({ activeToolName: null });
            if (success) {
              stateManager.setState({ errorMsg: 'Update successful! Please restart OpenChat AI to apply changes.' });
              setTimeout(() => {
                exit();
                process.exit(0);
              }, 3000);
            } else {
              stateManager.setState({ errorMsg: 'Update failed! Please check your network connection.' });
            }
          } else {
            setActiveDialog('none');
          }
        }
      });
    } else if (cmd === '/help') {
      stateManager.setState({ errorMsg: 'Slash commands: /update latest, /uninstall, /provider api, /add model, /all models, /agents, /skills, /history, /mcp, /tools, /permissions, /settings, /help, /exit' });
    } else if (cmd === '/exit') {
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

  return (
    <Box flexDirection="column" width="100%" padding={1}>
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

        {/* Command Palette Overlay */}
        {showCommandPalette && (
          <Box justifyContent="center" marginY={1}>
            <CommandPalette 
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
        <Box flexDirection="row" borderStyle="single" borderColor={theme.accentColor} paddingX={1} marginY={0.5}>
          <Text color={theme.accentColor} bold>&gt; </Text>
          <Text>{prompt}</Text>
          <Text color="cyan">█</Text>
        </Box>
        <StatusBar state={state} />
      </Box>
    </Box>
  );
};
export default App;
