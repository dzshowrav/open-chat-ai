import fs from 'fs';

const filePath = 'src/ui/screens/ChatScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The helper function definition
const helperFunction = `
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
`;

// The new MessageItem code
const newMessageItemCode = `const MessageItem = ({ msg, idx, isActive, allMessages, isMobile }: { msg: Message, idx: number, isActive: boolean, allMessages: Message[], isMobile: boolean }) => {
  const theme = themeManager.getCurrentTheme();

  if (msg.role === 'system') return null;

  const highlightBg = getHighlightBgColor(theme.backgroundColor, theme.darkMode);

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
      <Box key={idx} flexDirection="column" marginY={isMobile ? 0.1 : 0.5} paddingX={isMobile ? 1 : 2}>
        <Box
          borderStyle={customBorder}
          borderColor={theme.primaryColor}
          paddingLeft={2}
          paddingRight={2}
          paddingY={isMobile ? 0.2 : 0.5}
          background={highlightBg as any}
        >
          <Text color={theme.primaryColor} wrap="wrap">{msg.content}</Text>
        </Box>
      </Box>
    );
  }

  if (msg.role === 'assistant') {
    const toolCalls = getToolCallsArray(msg.tool_calls);
    return (
      <Box 
        key={idx} 
        flexDirection="column" 
        marginY={isMobile ? 0.1 : 0.5} 
        paddingX={isMobile ? 1 : 2}
        paddingY={isMobile ? 0.2 : 0.5}
        background={highlightBg as any}
      >
        {msg.reasoning_content && (
          <Box flexDirection="column" marginY={isMobile ? 0.1 : 0.2} marginLeft={1}>
            <Box flexDirection="row">
              <Text color="#7aa2f7" bold>● Thinking Process</Text>
            </Box>
            <Box marginLeft={1} flexShrink={1} flexGrow={1}>
              <Text color={theme.darkMode ? '#80d4ff' : '#2a4365'} italic wrap="wrap">{msg.reasoning_content}</Text>
            </Box>
          </Box>
        )}

        {msg.content ? (
          <Box flexDirection="row" marginLeft={1}>
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
`;

// Insert the helper function definition after imports
const settingRepoMarker = 'const settingRepo = new SettingRepository();';
const settingRepoIndex = content.indexOf(settingRepoMarker);
if (settingRepoIndex !== -1) {
  const insertIndex = settingRepoIndex + settingRepoMarker.length;
  content = content.slice(0, insertIndex) + helperFunction + content.slice(insertIndex);
}

// Find where MessageItem starts and where tool role starts
const startMarker = 'const MessageItem =';
const endMarker = 'if (msg.role === \'tool\') {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found!");
  process.exit(1);
}

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

content = before + newMessageItemCode + '\n  ' + after;

// Also update StreamingResponse component to apply highlighted background
const streamingStart = 'const StreamingResponse: React.FC<{ startTime: number | null; activeToolName: string | null; isMobile: boolean }> =';
const streamingIndex = content.indexOf(streamingStart);
if (streamingIndex !== -1) {
  console.log("Updating StreamingResponse component...");
  const streamingEnd = 'export const ChatScreen:';
  const streamingEndIndex = content.indexOf(streamingEnd);
  if (streamingEndIndex !== -1) {
    const streamingBefore = content.slice(0, streamingIndex);
    const streamingAfter = content.slice(streamingEndIndex);
    
    const newStreamingCode = `const StreamingResponse: React.FC<{ startTime: number | null; activeToolName: string | null; isMobile: boolean }> = ({ startTime, activeToolName, isMobile }) => {
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

  const highlightBg = getHighlightBgColor(theme.backgroundColor, theme.darkMode);

  return (
    <Box 
      flexDirection="column" 
      marginY={isMobile ? 0.1 : 0.5} 
      paddingX={isMobile ? 1 : 2}
      paddingY={isMobile ? 0.2 : 0.5}
      background={highlightBg as any}
    >
      {reasoning && (
        <Box flexDirection="column" marginY={isMobile ? 0.1 : 0.2} marginLeft={1}>
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
`;
    content = streamingBefore + newStreamingCode + '\n' + streamingAfter;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated ChatScreen.tsx!");
