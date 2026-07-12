import React, { useState, useEffect } from 'react';
import { Box, Text, Static, useStdout } from 'ink';
import { eventBus } from '../../core/events.js';
import { Message } from '../../types/index.js';
import { themeManager } from '../theme/themeManager.js';
import { AppState } from '../../core/state.js';
import { MarkdownWorker } from '../components/MarkdownWorker.js';
import { DiffCard, WriteFileCard, EditCard } from '../components/DiffCard.js';
import { ToolStatusTitle } from '../components/tool-status-title.js';
import { ToolErrorCard } from '../components/tool-error-card.js';
import { ToolCountSummary } from '../components/tool-count-summary.js';
import { ShellSubmessageMotion } from '../components/shell-submessage-motion.js';
import { SettingRepository } from '../../database/repositories/settingRepository.js';

const settingRepo = new SettingRepository();
function getHighlightBgColor(baseBg: string, darkMode: boolean): string {
  let hex = baseBg.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    return darkMode ? '#1a1a1a' : '#f5f5f5';
  }
  
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  
  if (darkMode) {
    r = Math.min(255, r + 15);
    g = Math.min(255, g + 15);
    b = Math.min(255, b + 18);
  } else {
    r = Math.max(0, r - 12);
    g = Math.max(0, g - 12);
    b = Math.max(0, b - 10);
  }
  
  const toHex = (c: number) => {
    const h = c.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

let cachedWords: Record<string, string> | null = null;

function resolveStatusWord(toolName: string | null): string {
  if (!toolName) {
    return 'Thinking...';
  }
  
  const baseVerb = toolName.split('(')[0].trim();
  if (!baseVerb) return 'Working...';
  
  if (cachedWords === null) {
    try {
      cachedWords = settingRepo.getSetting('dynamic_status_words') || {};
    } catch {
      cachedWords = {};
    }
  }
  
  if (cachedWords && cachedWords[baseVerb]) {
    return cachedWords[baseVerb];
  }
  
  const lowerTool = toolName.toLowerCase();
  const lowerVerb = baseVerb.toLowerCase();
  let resolved = '';
  
  if (lowerTool.includes('build') || lowerTool.includes('tsc')) resolved = 'Building...';
  else if (lowerTool.includes('install')) resolved = 'Installing...';
  else if (lowerTool.includes('uninstall')) resolved = 'Uninstalling...';
  else if (lowerTool.includes('revert')) resolved = 'Reverting...';
  else if (lowerTool.includes('clean')) resolved = 'Cleaning...';
  else if (lowerTool.includes('test') || lowerTool.includes('jest') || lowerTool.includes('pytest')) resolved = 'Debugging...';
  else if (lowerVerb.startsWith('read') || lowerVerb.startsWith('view')) resolved = 'Reading...';
  else if (lowerVerb.startsWith('write') || lowerVerb.startsWith('create')) resolved = 'Writing...';
  else if (lowerVerb.startsWith('edit') || lowerVerb.startsWith('replace')) resolved = 'Editing...';
  else if (lowerVerb.startsWith('grep') || lowerVerb.startsWith('glob') || lowerVerb.startsWith('find') || lowerVerb.startsWith('search')) resolved = 'Searching...';
  else if (lowerVerb.startsWith('fetch')) resolved = 'Fetching...';
  else if (lowerVerb.startsWith('run') || lowerVerb.startsWith('bash') || lowerVerb.startsWith('execute') || lowerVerb.startsWith('spawn')) resolved = 'Running...';
  else if (lowerVerb.startsWith('sequential_thinking')) resolved = 'Thinking...';
  else if (lowerVerb.startsWith('delegate') || lowerVerb.startsWith('task')) resolved = 'Planning...';
  else if (lowerVerb.startsWith('generate_image')) resolved = 'Creating...';
  else if (lowerVerb.startsWith('schedule')) resolved = 'Preparing...';
  else if (lowerVerb.startsWith('ask_question') || lowerVerb.startsWith('question')) resolved = 'Waiting...';
  
  if (!resolved) {
    if (lowerVerb.endsWith('e')) {
      resolved = baseVerb.slice(0, -1) + 'ing...';
    } else if (lowerVerb.endsWith('y')) {
      resolved = baseVerb.slice(0, -1) + 'ying...';
    } else {
      resolved = baseVerb + 'ing...';
    }
    resolved = resolved.charAt(0).toUpperCase() + resolved.slice(1);
  }
  
  if (cachedWords) {
    cachedWords[baseVerb] = resolved;
    try {
      settingRepo.setSetting('dynamic_status_words', cachedWords);
    } catch {}
  }
  
  return resolved;
}

interface ChatScreenProps {
  messages: Message[];
  state: AppState;
}

function getToolCallsArray(toolCalls: any): any[] {
  if (!toolCalls) return [];
  if (Array.isArray(toolCalls)) return toolCalls;
  if (typeof toolCalls === 'string') {
    try {
      let parsed = JSON.parse(toolCalls);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed); // Handle double-encoded JSON
      }
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch {
      return [];
    }
  }
  if (typeof toolCalls === 'object') return [toolCalls];
  return [];
}

interface ThinkingIndicatorProps {
  startTime?: number | null;
  isActive?: boolean;
  activeToolName?: string | null;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ startTime, isActive = true, activeToolName }) => {
  const theme = themeManager.getCurrentTheme();
  const [elapsed, setElapsed] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      if (startTime) {
        setElapsed(Math.round((Date.now() - startTime) / 1000));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const statusWord = resolveStatusWord(activeToolName ?? null);

  if (!isActive) {
    return (
      <Box flexDirection="row">
        <Text color={theme.accentColor} bold>{statusWord}</Text>
      </Box>
    );
  }

  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const spinnerChar = spinners[tick % spinners.length];

  if (startTime) {
    return (
      <Box flexDirection="row">
        <Text color="green" bold>{spinnerChar} </Text>
        <Text color={theme.primaryColor} bold>{statusWord} </Text>
        <Text color="cyan" bold>[{elapsed}s]</Text>
      </Box>
    );
  }

  const waveDots = ['.', '..', '...', '....', '...'];
  const currentDots = waveDots[Math.floor(tick / 2) % waveDots.length];

  return (
    <Box flexDirection="row">
      <Text color={theme.accentColor} bold>{statusWord.replace(/\.\.\./g, '')}{currentDots}</Text>
      <Box marginLeft={1}>
        <Text color={tick % 2 === 0 ? 'green' : 'gray'}>█</Text>
      </Box>
    </Box>
  );
};

const MessageItem = ({ msg, idx, isActive, allMessages, isMobile, isUltraCompact }: { msg: Message, idx: number, isActive: boolean, allMessages: Message[], isMobile: boolean, isUltraCompact: boolean }) => {
  const theme = themeManager.getCurrentTheme();

  if (msg.role === 'system') return null;

  const cardBorderColor = theme.darkMode ? '#3b4261' : '#cbd5e1';

  if (msg.role === 'user') {
    const customBorder = {
      left: '┃',
      top: '',
      right: '',
      bottom: '',
      topLeft: '',
      topRight: '',
      bottomLeft: '',
      bottomRight: ''
    };

    return (
      <Box key={idx} flexDirection="column" marginY={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} paddingLeft={isUltraCompact ? 1 : 2}>
        <Box
          borderStyle={customBorder}
          borderColor={theme.primaryColor}
          paddingLeft={isUltraCompact ? 1 : 2}
          paddingY={0}
        >
          <Text color={theme.primaryColor} wrap="wrap">{msg.content}</Text>
        </Box>
      </Box>
    );
  }

  if (msg.role === 'assistant') {
    const toolCalls = getToolCallsArray(msg.tool_calls);
    const customLeftBorder = {
      left: '│',
      top: '',
      right: '',
      bottom: '',
      topLeft: '',
      topRight: '',
      bottomLeft: '',
      bottomRight: ''
    };

    return (
      <Box 
        key={idx} 
        flexDirection="column" 
        marginY={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} 
        paddingX={isUltraCompact ? 1 : (isMobile ? 1 : 2)}
        paddingTop={0}
        paddingBottom={isUltraCompact ? 0 : (isMobile ? 0.2 : 1)}
        borderStyle={isUltraCompact ? customLeftBorder : "round"}
        borderColor={cardBorderColor}
      >
        {msg.reasoning_content && (
          <Box flexDirection="column" marginY={0} marginLeft={1}>
            <Box flexDirection="row">
              <Text color="#7aa2f7" bold>● Thinking Process</Text>
            </Box>
            <Box marginLeft={1} flexShrink={1} flexGrow={1}>
              <Text color={theme.darkMode ? '#80d4ff' : '#2a4365'} italic wrap="wrap">{msg.reasoning_content}</Text>
            </Box>
          </Box>
        )}

        {msg.content ? (
          <Box flexDirection="row" marginLeft={1} marginTop={msg.reasoning_content && !isUltraCompact ? 0.5 : 0}>
            <Box marginRight={1}>
              <Text color={theme.accentColor} bold>●</Text>
            </Box>
            <Box flexShrink={1} flexGrow={1}>
              <MarkdownWorker content={msg.content} isStreaming={isActive} />
            </Box>
          </Box>
        ) : (
          !msg.reasoning_content && (
            <Box flexDirection="row" marginLeft={1}>
              <Box marginRight={1}>
                <Text color={theme.accentColor} bold>●</Text>
              </Box>
              <ThinkingIndicator startTime={(msg as any).startTime} isActive={isActive} />
            </Box>
          )
        )}
        
        {toolCalls.length > 0 && (
          <Box flexDirection="column" marginLeft={1} marginY={isMobile ? 0.1 : 0.2}>
            {toolCalls.map((call: any, cIdx: number) => {
              const funcName = call.function?.name || 'unknown';
              let argsObj: any = {};
              if (call.function?.arguments) {
                try {
                  argsObj = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
                  if (typeof argsObj === 'string') argsObj = JSON.parse(argsObj);
                } catch (e) {}
              }

              // ── edit_file: search-and-replace block ──
              if (funcName === 'edit_file' && argsObj.targetContent !== undefined && argsObj.replacementContent !== undefined) {
                return (
                  <Box key={cIdx} flexDirection="column" marginY={0.5}>
                    <DiffCard
                      path={argsObj.path || '(unknown)'}
                      targetContent={argsObj.targetContent}
                      replacementContent={argsObj.replacementContent}
                      isNewFile={false}
                    />
                  </Box>
                );
              }

              // ── edit: oldString / newString ──
              if (funcName === 'edit' && argsObj.oldString !== undefined && argsObj.newString !== undefined) {
                return (
                  <Box key={cIdx} flexDirection="column" marginY={0.5}>
                    <EditCard
                      path={argsObj.path || '(unknown)'}
                      oldString={argsObj.oldString}
                      newString={argsObj.newString}
                    />
                  </Box>
                );
              }

              // ── write / write_file: full file write ──
              if ((funcName === 'write' || funcName === 'write_file') && argsObj.content !== undefined) {
                return (
                  <Box key={cIdx} flexDirection="column" marginY={0.5}>
                    <WriteFileCard
                      path={argsObj.path || '(unknown)'}
                      content={argsObj.content}
                      isNew={true}
                    />
                  </Box>
                );
              }

              return null;
            })}
          </Box>
        )}
      </Box>
    );
  }

  if (msg.role === 'tool') {
    // Only treat as error if the content starts with 'Error:' or 'Failed:'
    // NOT if file content merely contains the word 'error' somewhere
    const content = msg.content || '';
    const isError = /^(Error|Failed|ENOENT|EACCES|Cannot|Unexpected|SyntaxError|TypeError|ReferenceError)/i.test(content.trim());
    
    // Lookup actual tool name from the matching assistant message's tool_calls
    let actualToolName = 'Action';
    let baseToolName = 'Action';
    const toolCallId = (msg as any).tool_call_id;
    if (toolCallId) {
      for (const m of allMessages) {
        if (m.role === 'assistant') {
          const calls = getToolCallsArray(m.tool_calls);
          const match = calls.find((c: any) => c.id === toolCallId);
          if (match) {
            baseToolName = match.function?.name || 'Action';
            actualToolName = baseToolName;
            try {
              let argsObj = match.function.arguments;
              if (typeof argsObj === 'string') {
                argsObj = JSON.parse(argsObj);
                if (typeof argsObj === 'string') argsObj = JSON.parse(argsObj);
              }
              const targetStr = String(argsObj.path || argsObj.url || argsObj.query || argsObj.command || '');
              if (targetStr) {
                 const shortTarget = targetStr.length > 50 ? targetStr.slice(0, 20) + '...' + targetStr.slice(-25) : targetStr;
                 
                 // Capitalize base tool name cleanly (e.g. read_file -> Read)
                 let niceName = baseToolName.replace(/_file|_process/g, '');
                 niceName = niceName.charAt(0).toUpperCase() + niceName.slice(1);
                 
                 actualToolName = `${niceName}(${shortTarget})`;
              } else {
                 let niceName = baseToolName.charAt(0).toUpperCase() + baseToolName.slice(1);
                 actualToolName = niceName;
              }
            } catch (e) {
               actualToolName = baseToolName.charAt(0).toUpperCase() + baseToolName.slice(1);
            }
            break;
          }
        }
      }
    }
    
    const linesCount = (msg.content || '').split('\n').length;
    const isVerboseTool = ['read', 'read_file'].includes(baseToolName);
    
    return (
      <Box key={idx} flexDirection="column" marginY={isMobile ? 0.1 : 0.2} marginLeft={1}>
        <ToolStatusTitle toolName={actualToolName} status={isError ? 'error' : 'success'} />
        {isError && msg.content && (
          <Box marginTop={isMobile ? 0.2 : 0.5}>
            <ToolErrorCard errorContent={msg.content} />
          </Box>
        )}
        {!isError && msg.content && (
          <Box marginLeft={1} marginY={isMobile ? 0.1 : 0.2}>
            {isVerboseTool ? (
              <Text color="gray">  ⎿  Read {linesCount} lines (Context loaded in background)</Text>
            ) : (
              <ShellSubmessageMotion output={msg.content} isActive={isActive} />
            )}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

const StreamingResponse: React.FC<{ startTime: number | null; activeToolName: string | null; isMobile: boolean; isUltraCompact: boolean }> = ({ startTime, activeToolName, isMobile, isUltraCompact }) => {
  const theme = themeManager.getCurrentTheme();
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    const handleToken = (payload: { reasoningToken?: string }) => {
      if (payload.reasoningToken) setReasoning(prev => prev + payload.reasoningToken);
    };

    eventBus.on('stream:token', handleToken);
    return () => {
      eventBus.off('stream:token', handleToken);
    };
  }, []);

  const cardBorderColor = theme.darkMode ? '#3b4261' : '#cbd5e1';
  const customLeftBorder = {
    left: '│',
    top: '',
    right: '',
    bottom: '',
    topLeft: '',
    topRight: '',
    bottomLeft: '',
    bottomRight: ''
  };

  return (
    <Box 
      flexDirection="column" 
      marginY={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} 
      paddingX={isUltraCompact ? 1 : (isMobile ? 1 : 2)}
      paddingTop={0}
      paddingBottom={isUltraCompact ? 0 : (isMobile ? 0.2 : 1)}
      borderStyle={isUltraCompact ? customLeftBorder : "round"}
      borderColor={cardBorderColor}
    >
      {reasoning && (
        <Box flexDirection="column" marginY={0} marginLeft={1}>
          <Box flexDirection="row">
            <Text color="#7aa2f7" bold>● Thinking Process</Text>
          </Box>
          <Box marginLeft={1}>
            <Text color={theme.darkMode ? '#80d4ff' : '#2a4365'} italic>{reasoning}</Text>
          </Box>
        </Box>
      )}

      {!reasoning && (
        <Box flexDirection="row" marginLeft={1}>
          <Text color={theme.accentColor} bold>● </Text>
          <ThinkingIndicator startTime={startTime} isActive={true} activeToolName={activeToolName} />
        </Box>
      )}
    </Box>
  );
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ messages, state }) => {
  const theme = themeManager.getCurrentTheme();
  const { stdout } = useStdout();
  const rows = stdout?.rows || 24;
  const isMobile = rows < 18;
  const isUltraCompact = rows < 15;
  
  return (
    <Box flexDirection="column" paddingX={0} marginY={0} width="100%">
      <Static items={messages}>
        {(msg, idx) => <MessageItem key={idx} msg={msg} idx={idx} isActive={false} allMessages={messages} isMobile={isMobile} isUltraCompact={isUltraCompact} />}
      </Static>

      {(state.isStreaming || state.activeToolName) && (
        <StreamingResponse startTime={state.streamingStartTime} activeToolName={state.activeToolName} isMobile={isMobile} isUltraCompact={isUltraCompact} />
      )}
    </Box>
  );
};

