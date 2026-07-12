import fs from 'fs';

const filePath = 'src/ui/screens/ChatScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The new MessageItem code with corrected vertical margins (no marginY doubling)
const newMessageItemCode = `const MessageItem = ({ msg, idx, isActive, allMessages, isMobile, isUltraCompact }: { msg: Message, idx: number, isActive: boolean, allMessages: Message[], isMobile: boolean, isUltraCompact: boolean }) => {
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
      <Box 
        key={idx} 
        flexDirection="column" 
        marginTop={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} 
        marginBottom={0} 
        paddingLeft={isUltraCompact ? 1 : 2}
      >
        <Box
          borderStyle={customBorder}
          borderColor={theme.primaryColor}
          paddingLeft={1}
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
        marginTop={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} 
        marginBottom={0} 
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={1}
        borderStyle={isUltraCompact ? customLeftBorder : "round"}
        borderColor={cardBorderColor}
      >
        {msg.reasoning_content && (
          <Box flexDirection="column" marginY={0} marginLeft={0}>
            <Box flexDirection="row">
              <Text color="#7aa2f7" bold>● Thinking Process</Text>
            </Box>
            <Box marginLeft={1} flexShrink={1} flexGrow={1}>
              <Text color={theme.darkMode ? '#80d4ff' : '#2a4365'} italic wrap="wrap">{msg.reasoning_content}</Text>
            </Box>
          </Box>
        )}

        {msg.content ? (
          <Box flexDirection="row" marginLeft={0} marginTop={msg.reasoning_content && !isUltraCompact ? 0.5 : 0}>
            <Box marginRight={1}>
              <Text color={theme.accentColor} bold>●</Text>
            </Box>
            <Box flexShrink={1} flexGrow={1}>
              <MarkdownWorker content={msg.content} isStreaming={isActive} />
            </Box>
          </Box>
        ) : (
          !msg.reasoning_content && (
            <Box flexDirection="row" marginLeft={0}>
              <Box marginRight={1}>
                <Text color={theme.accentColor} bold>●</Text>
              </Box>
              <ThinkingIndicator startTime={(msg as any).startTime} isActive={isActive} />
            </Box>
          )
        )}
        
        {toolCalls.length > 0 && (
          <Box flexDirection="column" marginLeft={0} marginY={isMobile ? 0.1 : 0.2}>
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

// Also update StreamingResponse component to apply corrected vertical margins
const streamingStart = 'const StreamingResponse: React.FC<{';
const streamingIndex = content.indexOf(streamingStart);
if (streamingIndex !== -1) {
  console.log("Updating StreamingResponse component...");
  const streamingEnd = 'export const ChatScreen:';
  const streamingEndIndex = content.indexOf(streamingEnd);
  if (streamingEndIndex !== -1) {
    const streamingBefore = content.slice(0, streamingIndex);
    const streamingAfter = content.slice(streamingEndIndex);
    
    const newStreamingCode = `const StreamingResponse: React.FC<{ startTime: number | null; activeToolName: string | null; isMobile: boolean; isUltraCompact: boolean }> = ({ startTime, activeToolName, isMobile, isUltraCompact }) => {
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
      marginTop={isUltraCompact ? 0 : (isMobile ? 0.1 : 0.5)} 
      marginBottom={0} 
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={1}
      borderStyle={isUltraCompact ? customLeftBorder : "round"}
      borderColor={cardBorderColor}
    >
      {reasoning && (
        <Box flexDirection="column" marginY={0} marginLeft={0}>
          <Box flexDirection="row">
            <Text color="#7aa2f7" bold>● Thinking Process</Text>
          </Box>
          <Box marginLeft={1}>
            <Text color={theme.darkMode ? '#80d4ff' : '#2a4365'} italic>{reasoning}</Text>
          </Box>
        </Box>
      )}

      {!reasoning && (
        <Box flexDirection="row" marginLeft={0}>
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
console.log("Successfully updated ChatScreen.tsx with corrected vertical margins!");
