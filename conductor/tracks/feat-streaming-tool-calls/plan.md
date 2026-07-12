# Plan: Real-time Tool Call Streaming + Architecture Refactor

## Steps (1-7, excluding Low priority items)

### Step 1: Event Bus (events.ts)
Add content block lifecycle events:
- `stream:tool_call_start` — when a new tool_call block begins
- `stream:tool_call_delta` — when partial JSON args arrive
- `stream:tool_call_end` — when tool call is complete

### Step 2: SSE Parser (apiEngine.ts)
Emit tool_call events during streaming so UI can render in real-time.

### Step 3: Content Block Helpers (src/core/contentBlocks.ts)
Extract clean helper functions from article pattern:
- createContentBlock, handleContentDelta, handleContentEnd, isToolResult

### Step 4: ToolCallStreamCard Component
New Ink component for streaming tool call visualization.

### Step 5: ChatScreen.tsx — StreamingResponse Update
Handle tool_call_start/delta/end events in StreamingResponse.

### Step 6: App.tsx — triggerAiCompletion Refactor
Refactor the while loop to use recursive generateResponse pattern.

### Step 7: index.ts — Ink Render Config Fix
Add patchConsole: false, exitOnCtrlC: false to render call.
