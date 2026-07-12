# OpenCode (OpenChat) Plugin System - Ultra Detailed Documentation

> Ei dokumentation OpenCode/OpenChat er complete plugin system, architecture, tool registration, MCP integration, skills management, event system, permission system, database schema, and execution flow niye likha. Banglay sudhu English letter diye explain kora hoyeche.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [ToolManager - The Central Registry](#2-toolmanager---the-central-registry)
3. [Three Layers of Tools](#3-three-layers-of-tools)
4. [MCP Server System](#4-mcp-server-system)
5. [Skills Management System](#5-skills-management-system)
6. [Event Bus System](#6-event-bus-system)
7. [Permission System](#7-permission-system)
8. [Database Schema](#8-database-schema)
9. [State Management](#9-state-management)
10. [Context Builder & Prompt Engineering](#10-context-builder--prompt-engineering)
11. [API Engine & AI Communication](#11-api-engine--ai-communication)
12. [Complete Execution Flow](#12-complete-execution-flow)
13. [Application Startup Flow](#13-application-startup-flow)
14. [How to Create a New Tool](#14-how-to-create-a-new-tool)
15. [How to Create an MCP Server](#15-how-to-create-an-mcp-server)
16. [How to Create a Skill](#16-how-to-create-a-skill)
17. [Agent System](#17-agent-system)
18. [Subagent & Delegation System](#18-subagent--delegation-system)
19. [Theme System](#19-theme-system)
20. [All Source Files Map](#20-all-source-files-map)

---

## 1. Architecture Overview

### 1.1 Big Picture

OpenCode plugin system **3 ta distinct layer** niye gora. Ekhane **ToolManager** hocche main hub jar moddhe shob tool register hoy. AI model function-calling er maddhome ei tool gula call kore.

```
+-------------------------------------------------------+
|                    AI MODEL                            |
|  (GPT-4, Claude, DeepSeek, etc. via API Engine)       |
+---------------------------+---------------------------+
                            |
              Function Call (tool_use)
                            |
                   +--------v---------+
                   |  ToolManager     |
                   |  (Central Hub)   |
                   +--+----+----+-----+
                      |    |    |
          +-----------+    |    +-----------+
          |                |                |
    +-----v------+  +-----v------+  +------v------+
    | Native     |  | Extended   |  | MCP Server  |
    | Tools      |  | Tools      |  | Tools       |
    | (Hardcore) |  | (High-lvl) |  | (External)  |
    +------------+  +------------+  +-------------+
          |                |                |
    File ops, shell,  grep, glob, web,   figma, github,
    process mgmt      delegate, skill    context7, etc
```

### 1.2 File System Structure

```
src/
  tools/
    toolManager.ts        <-- CENTRAL TOOL REGISTRY
    impl/
      index.ts            <-- Built-in tools register function
      nativeTools.ts      <-- Native platform tools (20 tools)
      extendedTools.ts    <-- Extended tools (many more)
  mcp/
    mcpManager.ts         <-- MCP server connection manager
  skills/
    skillsManager.ts      <-- Skill loader from disk
  core/
    engine.ts             <-- App engine (startup, lifecycle)
    events.ts             <-- Event bus (pub-sub)
    state.ts              <-- Global state manager
    contextBuilder.ts     <-- System prompt builder
    constants.ts          <-- Constants, themes, commands
  database/
    connection.ts         <-- SQLite connection & init
    schema.sql            <-- Complete database schema
    repositories/         <-- Data access layer
  api/
    apiEngine.ts          <-- AI provider communication
  ui/
    App.tsx               <-- React Ink UI
    components/           <-- UI components
    screens/              <-- Screen components
  index.ts                <-- Entry point
```

---

## 2. ToolManager - The Central Registry

### 2.1 File Location

```
src/tools/toolManager.ts
```

### 2.2 Core Data Structures

```typescript
// Tool definition structure
interface ToolDefinition {
  name: string;           // Tool name (e.g., "read", "bash", "figma_get_figma_data")
  description: string;    // Description for AI to understand
  parameters: {           // JSON Schema for function-calling
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Internal registry storage
private static registry: Map<string, {
  definition: ToolDefinition;
  execute: (args: any) => Promise<any>;
}> = new Map();
```

### 2.3 Three Core Methods

#### Method 1: `registerTool(definition, execute)`

```typescript
static registerTool(definition: ToolDefinition, execute: (args: any) => Promise<any>) {
  this.registry.set(definition.name, { definition, execute });
}
```

**Ki kore:** Tool name diye ekta entry registry Map e save kore. Name unique hote hobe.

**Kothay theke call hoy:**
- `registerBuiltInTools()` → index.ts (44-676 line)
- `registerNativeTools()` → nativeTools.ts (197-1300 line)
- `registerExtendedTools()` → extendedTools.ts (127-... line)
- `McpManager.registerMcpTool()` → mcpManager.ts (143-162 line)

#### Method 2: `getToolSchemas()`

```typescript
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
```

**Ki kore:** Shob registered tool theke OpenAI-compatible function-calling schema generate kore. EI schema TA AI MODEL KE PATHANO HOY. AI ei schema dekhei bujhe kon tool ki kore and ki parameter nibe.

#### Method 3: `executeTool(name, args)`

```typescript
static async executeTool(name: string, args: any): Promise<any> {
  const tool = this.registry.get(name);
  if (!tool) throw new Error(`Tool "${name}" is not registered.`);

  // 1. Permission check
  const permitted = await this.verifyPermission(name, args);
  if (!permitted) throw new Error(`Permission denied`);

  // 2. Emit start event (UI update)
  eventBus.emit('tool:started', { toolName: name, args });

  // 3. Execute & measure
  const startTime = Date.now();
  try {
    const result = await tool.execute(args);
    eventBus.emit('tool:finished', { toolName: name, result, duration: Date.now() - startTime });
    return result;
  } catch (error) {
    eventBus.emit('tool:failed', { toolName: name, error, duration: Date.now() - startTime });
    throw error;
  }
}
```

### 2.4 Permission Verification System

```typescript
private static async verifyPermission(toolName: string, args: any): Promise<boolean> {
  const policy = this.permissionRepo.getPermission(toolName);

  if (policy === 'always_allow') return true;    // Direct execute
  if (policy === 'deny') return false;           // Block directly

  // 'ask' or 'allow_once' → emit permission:request event
  return new Promise<boolean>((resolve) => {
    eventBus.emit('permission:request', {
      toolName,
      args,
      resolve: (decision) => {
        if (decision === 'always_allow') {
          this.permissionRepo.setPermission(toolName, 'always_allow');
          resolve(true);
        } else if (decision === 'allow_once') {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    });
  });
}
```

**Permission levels (4 ta):**

| Level         | Behavior                                                    |
| ------------- | ----------------------------------------------------------- |
| `always_allow`| Permission charai direct execute hoy, security risk na       |
| `allow_once`  | First bar user ke jiggesh kore, tarpor mone rakhe na         |
| `ask`         | Prottek bar user ke confirm korte hobe (default behavior)    |
| `deny`        | Tool block kora, use kora jabena                           |

**Default permissions (database seed):**
- read_file, list_directory, glob, grep → always_allow
- write_file, edit_file, delete_file, bash, git_push, git_commit → ask

---

## 3. Three Layers of Tools

### 3.1 Layer 1: Built-in Tools (Core)

**File:** `src/tools/impl/index.ts`
**Register function:** `registerBuiltInTools()` (line 42)

Ei tools gula **sabcheye fundamental** - file read/write, shell execution, git operations.

| Tool Name              | Description                                                  | Category |
| ---------------------- | ------------------------------------------------------------ | -------- |
| `read`                 | Line-number pagination saha file read/directory list          | File     |
| `read_file`            | Complete file content read (compatibility alias)              | File     |
| `write`                | File create/overwrite kore, parent directory auto-create kore | File     |
| `write_file`           | File write (compatibility alias)                              | File     |
| `edit`                 | String-based find-and-replace, git-style diff return kore     | File     |
| `edit_file`            | Search-and-replace block editing (compatibility)              | File     |
| `list_directory`       | Directory listing with size, type, modified time              | File     |
| `bash`                 | Shell command execute kore, non-interactive flags enforce kore| Shell    |
| `git_status`           | Git working tree status dekhabe                               | Shell    |
| `git_diff`             | Staged/unstaged git diff dekhabe                              | Shell    |
| `spawn_process`        | Long-running background process start kore (dev server, REPL) | Shell    |
| `read_process`         | Background process er stdout/stderr output porbe              | Shell    |
| `write_process`        | Background process er stdin e input pathabe                    | Shell    |
| `kill_process`         | Background process terminate korbe                             | Shell    |
| `list_processes`       | All active background processes list korbe                    | Shell    |
| `fetch_url_content`    | Web page fetch kore markdown e convert kore                   | Web      |
| `search_memory`        | Past chat sessions e keyword search kore                      | Memory   |

**Key implementation detail - Path security:**

```typescript
// Safety helper — ensures file access is within workspace boundary
function getSafePath(relativePath: string, explicit_permission?: boolean): string {
  const wsPath = stateManager.getState().workspacePath;
  const resolved = path.isAbsolute(relativePath)
    ? path.resolve(relativePath)
    : path.resolve(wsPath, relativePath);
  if (!resolved.startsWith(wsPath) && !explicit_permission) {
    throw new Error(
      'SECURITY VIOLATION: Path is outside the active workspace boundary. ' +
      'You MUST output a message asking the user for explicit confirmation...'
    );
  }
  return resolved;
}
```

### 3.2 Layer 2: Extended Tools

**File:** `src/tools/impl/extendedTools.ts`
**Register function:** Called from `registerBuiltInTools()` (line 672: `registerExtendedTools()`)

Ei tools gula **higher-level** — search, web, TypeScript, agent coordination, skills, MCP utilities.

#### File Search Tools

| Tool Name | Description                                              |
| --------- | -------------------------------------------------------- |
| `grep`    | Regex content search across files, returns line numbers   |
| `glob`    | Pattern-based file name search (e.g., `*.ts`, `**/*.tsx`) |

#### Web Tools

| Tool Name         | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `webfetch`        | URL fetch kore clean readable text e convert kore      |
| `websearch`       | DuckDuckGo diye general web search, titles+URLs returns |
| `websearch_cited` | Inline citation [1],[2] saha grounded search           |

#### TypeScript Tools

| Tool Name      | Description                                          |
| -------------- | ---------------------------------------------------- |
| `type_check`   | `tsc --noEmit` run kore type errors check kore        |
| `lookup_type`  | Type/interface/class definition search by name         |
| `list_types`   | Project e all types, interfaces, classes, enums list  |

#### Agent Coordination Tools

| Tool Name          | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `delegate`         | Background subagent e work delegate kore (async)               |
| `delegation_read`  | Delegation result porbe ID diye                                 |
| `delegation_list`  | All active/completed delegations list korbe                    |
| `task`             | Autonomous AI agent launch kore complex multi-step task er jonno |

#### Skills Tools

| Tool Name         | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `skill`           | Domain-specific skill instructions load kore          |
| `skill_find`      | Natural language query diye skill search kore         |
| `skill_use`       | Multiple skills ek sathe load kore                    |
| `skill_resource`  | Skill directory theke resource file read kore         |

#### Utility Tools

| Tool Name             | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `question`            | User ke interactive question ask kore (multiple choice)  |
| `todowrite`           | Structured task tracking list maintain kore              |
| `sequential_thinking` | Multi-step structured reasoning chain                    |

#### MCP Resource Tools

| Tool Name                     | Description                                |
| ----------------------------- | ------------------------------------------ |
| `list_mcp_resources`          | MCP server resources list                  |
| `list_mcp_resource_templates` | Parameterized URI templates list           |
| `read_mcp_resource`           | Specific MCP resource read kore            |

#### Delegation Internal Mechanism

```typescript
// ExtendedTools.ts — delegate function internal mechanism
{
  name: 'delegate',
  ...
}, async (args) => {
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  delegationStore.set(id, { agent: args.agent, prompt: args.prompt, status: 'running', ... });

  // Asynchronous execution via setImmediate
  setImmediate(async () => {
    // 1. Load ApiEngine dynamically
    const { ApiEngine } = await import('../../api/apiEngine.js');

    // 2. Get active provider & model
    const provider = state.activeProviderId ? providerRepo.getProvider(st.activeProviderId) : null;
    const model = st.activeModelId;

    // 3. Choose system prompt based on agent type
    const agentSystemPrompts = {
      'architect': 'You are a software architect...',
      'debug': 'You are a debugging expert...',
      'frontend-ui': 'You are a frontend developer specializing in UI/UX...',
      'code-reviewer': 'You are a thorough code reviewer...',
      // ... etc
    };

    // 4. Call AI with system prompt + task
    const response = await ApiEngine.chatCompletion({
      provider, model,
      messages: [
        { role: 'system', content: agentSystemPrompts[args.agent] },
        { role: 'user', content: args.prompt }
      ],
      stream: false
    });

    entry.status = 'completed';
    entry.result = response.content;
  });

  return `Delegation started. ID: ${id}...`;
}
```

### 3.3 Layer 3: Native Platform Tools

**File:** `src/tools/impl/nativeTools.ts`
**Register function:** Called from `registerBuiltInTools()` (line 675: `registerNativeTools()`)

Ei tools gula **AGY platform specification** follow kore — Claude Code er native tool set er compatible implementation.

| #  | Tool Name                 | Description                                          |
| -- | ------------------------- | ---------------------------------------------------- |
| 1  | `view_file`               | File read with line ranges, offsets, binary detection |
| 2  | `list_dir`                | Directory listing with file sizes                     |
| 3  | `write_to_file`           | File create/overwrite with metadata                   |
| 4  | `replace_file_content`    | Single contiguous content block replace                |
| 5  | `multi_replace_file_content` | Multiple non-contiguous edits in one file           |
| 6  | `grep_search`             | High-performance regex/literal file content search   |
| 7  | `run_command`             | Shell command execute with persistent terminal support|
| 8  | `command_status`          | Background command status check                       |
| 9  | `manage_task`             | Background task management (list, kill, status)       |
| 10 | `read_url_content`        | URL fetch → clean markdown                            |
| 11 | `search_web`              | DuckDuckGo web search with domain filter              |
| 12 | `define_subagent`        | Custom subagent preset define                         |
| 13 | `invoke_subagent`        | Background subagent AI completions spawn              |
| 14 | `manage_subagents`        | Subagent management (list, kill)                      |
| 15 | `send_message`            | Message send to another agent by conversation ID      |
| 16 | `generate_image`          | Text-to-image generation via Pollinations.ai          |
| 17 | `schedule`                | Background notification / cron timer                  |
| 18 | `ask_question`            | Multiple-choice question ask in terminal UI           |
| 19 | `ask_permission`          | Explicit security permission request                  |
| 20 | `list_permissions`        | All active permission grants list                     |

**Persistent Terminal System (run_command):**

`run_command` tool e **persistent terminal** feature ache. Ei system er maddhome command run kora hoy jate multiple command ekta session e execute kora jay.

```typescript
// NativeTools.ts — Persistent terminal implementation
interface PersistentTerminal {
  id: string;
  process: ChildProcess;     // Actual bash/zsh process
  outputBuffer: string;      // Accumulated stdout/stderr
  currentCommandToken: string | null;  // Unique delimiter token
  commandResolver: ((out: string) => void) | null;  // Promise resolver
}

// How token-based output splitting works:
// 1. Send: "npm run build\necho __CMD_DONE_1712345678__ $?\n"
// 2. Wait for token to appear in output
// 3. Split output at token location → command output + exit code
// 4. Return command output to caller

// Task backgrounding:
// If command takes longer than WaitMsBeforeAsync:
//   → Create TaskInfo entry
//   → Return immediately with task ID
//   → User can check later with command_status
```

---

## 4. MCP Server System

### 4.1 File Location

```
src/mcp/mcpManager.ts
```

### 4.2 What is MCP?

MCP = **Model Context Protocol**. Eta ekta **standard protocol** ja AI agents and external tools/data sources er moddhe communication standardize kore. OpenCode MCP server gula **subprocess** hishebe spawn kore and **JSON-RPC 2.0** diye communicate kore stdin/stdout er upore.

### 4.3 MCP Server Configuration

Database e `mcp_servers` table e save hoy:

```sql
CREATE TABLE IF NOT EXISTS mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    transport TEXT NOT NULL CHECK(transport IN ('stdio', 'http', 'https', 'sse')),
    command TEXT,              -- Command to execute if stdio
    arguments TEXT,            -- JSON Array of arguments if stdio
    url TEXT,                  -- URL if http/https/sse
    environment TEXT,          -- JSON Object of environment variables
    status TEXT NOT NULL DEFAULT 'disconnected',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    auto_connect BOOLEAN NOT NULL DEFAULT 1,
    ...
);
```

### 4.4 Complete Connection Sequence

```
McpManager.init()
  │
  ├──> DB query: SELECT * FROM mcp_servers WHERE enabled=1 AND auto_connect=1
  │
  ├──> For each server:
  │     │
  │     ├──> spawn(command, arguments, { stdio: ['pipe', 'pipe', 'ignore'] })
  │     │     │
  │     │     ├──> proc.stdout.on('data') → JSON-RPC response handler
  │     │     ├──> proc.on('close') → cleanup handler
  │     │     │
  │     │     ├──> STEP 1: Initialize
  │     │     │     send:  { jsonrpc: "2.0", method: "initialize",
  │     │     │              params: { protocolVersion: "2024-11-05",
  │     │     │                        capabilities: {},
  │     │     │                        clientInfo: { name: "OpenChat CLI", version: "1.0" } },
  │     │     │              id: 1 }
  │     │     │     recv:  { jsonrpc: "2.0", id: 1, result: { capabilities: { tools: {}, resources: {} } } }
  │     │     │
  │     │     ├──> STEP 2: tools/list
  │     │     │     send:  { jsonrpc: "2.0", method: "tools/list", params: {}, id: 2 }
  │     │     │     recv:  { jsonrpc: "2.0", id: 2,
  │     │     │              result: { tools: [
  │     │     │                { name: "get_figma_data", description: "...",
  │     │     │                  inputSchema: { type: "object", properties: {...} } },
  │     │     │                ...
  │     │     │              ] } }
  │     │     │
  │     │     └──> STEP 3: Register each tool with namespace
  │     │           ToolManager.registerTool({
  │     │             name: "figma_get_figma_data",  ← namespace: server_tool
  │     │             description: "[MCP: figma] ...",
  │     │             parameters: { ... }
  │     │           }, async (args) => {
  │     │             sendJsonRpc(server, "tools/call", { name: "get_figma_data", arguments: args })
  │     │           });
```

### 4.5 JSON-RPC Protocol Implementation

```typescript
// sendJsonRpc — writing to process stdin
private static sendJsonRpc(serverName: string, method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const server = this.activeServers.get(serverName);
    const id = server.idCounter++;
    const requestPayload = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    server.pendingRequests.set(id, resolve);       // Store resolver
    server.process.stdin?.write(                    // Write to stdin
      JSON.stringify(requestPayload) + '\n'
    );
  });
}

// Response handler (in stdout 'data' event)
proc.stdout?.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    try {
      const response = JSON.parse(line.trim());
      if (response.id !== undefined) {
        const resolver = serverState.pendingRequests.get(response.id);
        if (resolver) {
          resolver(response);               // Resolve the promise
          serverState.pendingRequests.delete(response.id);
        }
      }
    } catch { /* ignore malformed JSON */ }
  }
});
```

### 4.6 MCP Tool Name Namespacing

Jokhon ekta MCP server tool register kora hoy, tar name **prefix** hoy server name diye:

```typescript
private static registerMcpTool(serverName: string, mcpTool: any) {
  const namespacedName = `${serverName}_${mcpTool.name}`;
  // Example: "figma_get_figma_data"
  // Example: "context7_query-docs"
  // Example: "github_create_issue"
  // Example: "shadcn_get_component"
}
```

Ei namespacing er karone **tool name conflict** hoy na. Du-ta server same tool name use korleo tara alada hoy.

### 4.7 Active MCP Servers Management

```typescript
private static activeServers: Map<
  string,
  {
    process: ChildProcess;                    // The spawned subprocess
    idCounter: number;                        // JSON-RPC request ID counter
    pendingRequests: Map<number, (res: any) => void>;  // Pending request resolvers
  }
> = new Map();
```

### 4.8 Supported MCP Servers (as seen in the system)

| Server Name   | Tools Exposed                                   |
| ------------- | ----------------------------------------------- |
| `context7`    | resolve-library-id, query-docs                   |
| `figma`       | get_figma_data, download_figma_images             |
| `github`      | create_issue, create_pr, get_file, search...      |
| `shadcn`      | get_component, list_components, get_block, ...    |
| `magic_ui`    | getRegistryItem, listRegistryItems, search...     |
| `tailwindcss` | convert_css, generate_palette, install_tailwind...|
| `exa_search`  | web_search, web_fetch                             |
| `xdebug_mcp`  | set_breakpoint, step_over, evaluate, ...          |
| `filesystem`  | read, write, edit, search, glob, ...              |
| `chrome-devtools` | DOM, console, network, performance inspection |
| `sequential_thinking` | sequentialthinking (reasoning chain)     |
| `gh_grep`     | searchGitHub (real-world code patterns)           |
| `supermemory` | add/search/profile/list memory                    |

---

## 5. Skills Management System

### 5.1 File Location

```
src/skills/skillsManager.ts
```

### 5.2 What are Skills?

Skills hocche **pre-written instruction sets** (SKILL.md files) ja AI prompt e inject kora hoy. Ei instructions AI ke domain-specific knowledge, coding standards, and workflows provide kore.

### 5.3 Skill Discovery Paths

```typescript
const skillDirs = [
  path.join(homePath, '.config', 'openchat', 'skills'),   // Global config
  path.join(homePath, '.claude', 'skills'),                 // Claude compatibility
  ...(workspacePath ? [
    path.join(workspacePath, '.openchat', 'skills'),        // Workspace local
    path.join(workspacePath, '.skills'),                     // .skills dir
    path.join(workspacePath, 'skills')                       // skills dir
  ] : [])
];
```

**Search priority order:**
1. `~/.config/openchat/skills/<name>/SKILL.md`
2. `~/.claude/skills/<name>/SKILL.md`
3. `<workspace>/.openchat/skills/<name>/SKILL.md`
4. `<workspace>/.skills/<name>/SKILL.md`
5. `<workspace>/skills/<name>/SKILL.md`

Same name er skill **first match** tai priority pabe. Duplicate skip kora hoy.

### 5.4 Skill Loading Algorithm

```typescript
static loadWorkspaceSkills(): Skill[] {
  const skills: Skill[] = [];
  const seenIds = new Set<string>();

  for (const dir of skillDirs) {
    if (!fs.existsSync(dir)) continue;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const skillMdPath = path.join(itemPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const skillId = item.toLowerCase();
          if (seenIds.has(skillId)) continue;  // Duplicate skip

          const content = fs.readFileSync(skillMdPath, 'utf8');
          skills.push({
            id: item,
            name: item.charAt(0).toUpperCase() + item.slice(1),
            instructions: content,
            path: itemPath
          });
          seenIds.add(skillId);
        }
      }
    }
  }
  return skills;
}
```

### 5.5 Skill Prompt Injection

```typescript
static buildSkillsPrompt(skills: Skill[]): string {
  if (skills.length === 0) return '';

  let prompt = '\n--- AVAILABLE DEVELOPER SKILLS & STANDARDS ---\n';
  prompt += 'You should respect the following frameworks or coding standards:\n\n';

  for (const skill of skills) {
    prompt += `[Skill: ${skill.name}]\n`;
    prompt += `${skill.instructions}\n`;
    prompt += '------------------------------------------\n';
  }
  return prompt;
}
```

### 5.6 Skill Tool Flow

```
User: "bash theke ami jodi react component banai..."
  │
  ├──> AI decide kore: skill_use(["react-expert"]) call korbo
  │
  ├──> skill_use tool run hoy:
  │     ├──> Search: ~/.config/openchat/skills/react-expert/SKILL.md
  │     ├──> Search: ~/.claude/skills/react-expert/SKILL.md
  │     └──> Content return kore AI ke
  │
  ├──> AI skill instructions read kore
  │     ├──> Component patterns
  │     ├──> Best practices
  │     └──> Coding standards
  │
  └──> AI production-quality code generate kore
```

### 5.7 Available Skills (From System Data)

There are **100+ skills** available in the system including:

| Skill Category     | Example Skills                                        |
| ----------------- | ----------------------------------------------------- |
| Frontend & UI     | react-expert, nextjs-developer, vue-expert, angular   |
| Backend & API     | fastapi-expert, django-expert, nestjs-expert, laravel |
| Languages         | python-pro, typescript-pro, golang-pro, rust-engineer |
| Architecture      | architect, architecture-designer, microservices       |
| Testing           | test-driven-development, test-master, playwright      |
| Security          | security-reviewer, secure-code-guardian               |
| Performance       | performance-optimization, database-optimizer          |
| DevOps            | devops-engineer, terraform-engineer, kubernetes       |
| Mobile            | react-native-expert, flutter-expert, swift-expert     |
| AI/ML             | rag-architect, fine-tuning-expert, ml-pipeline        |
| Diagrams          | uml, archimate, bpmn, cloud, network, mindmap         |

---

## 6. Event Bus System

### 6.1 File Location

```
src/core/events.ts
```

### 6.2 Design Pattern

TypedEventBus hocche **typed publish-subscribe (pub-sub)** pattern. Eta singleton pattern e implement kora.

```typescript
class TypedEventBus {
  private emitter = new EventEmitter();  // Node.js EventEmitter
  constructor() {
    this.emitter.setMaxListeners(100);    // Prevent memory leak warnings
  }

  emit<K extends keyof AppEventPayloads>(event: K, payload: AppEventPayloads[K]): boolean;
  on<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this;
  once<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this;
  off<K extends keyof AppEventPayloads>(event: K, listener: (payload: AppEventPayloads[K]) => void): this;
}

export const eventBus = new TypedEventBus();  // Single global instance
```

### 6.3 Complete Event Catalog

```typescript
export interface AppEventPayloads {
  // App Lifecycle
  'app:start': void;
  'app:exit': void;

  // Provider & Model
  'provider:changed': { providerId: number; name: string };
  'provider:updated': { providerId: number };
  'model:changed': { modelId: string; providerId: number };
  'agent:changed': { agentName: string };

  // Session
  'session:created': { sessionId: number; title: string };
  'session:loaded': { sessionId: number };
  'session:updated': { sessionId: number };
  'session:deleted': { sessionId: number };

  // Message
  'message:sent': { sessionId: number; role: string; content: string };
  'message:received': { sessionId: number; role: string; content: string };

  // Tool Execution
  'tool:started': { toolName: string; args: Record<string, any> };
  'tool:finished': { toolName: string; result: any; duration: number };
  'tool:failed': { toolName: string; error: string; duration: number };
  'permission:request': { toolName: string; args: Record<string, any>; resolve: (val: 'always_allow' | 'allow_once' | 'deny') => void };

  // AI Streaming
  'stream:started': { sessionId: number; model: string };
  'stream:token': { token: string; reasoningToken?: string };
  'stream:finished': { fullText: string; fullReasoning?: string; tokensCount: number };

  // Workspace
  'workspace:changed': { path: string };
  'workspace:scanned': { path: string; fileCount: number };

  // User Interaction
  'question:pending': { question: string; options?: string[] };
  'question:request': { question: string; options: string[]; resolve: (answer: string) => void };
}
```

### 6.4 Event Flow Diagram

```
Tool Execution Event Flow:
                            +---------+
                            |   AI    |
                            +----+----+
                                 | call "bash({command: 'npm build'})"
                                 v
                         +------+------+
                         | ToolManager |
                         | executeTool |
                         +------+------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
          +---------+------+      +--------+--------+
          | eventBus.emit  |      | Execute Handler |
          | tool:started   |      | (bash runs)     |
          +---------+------+      +--------+--------+
                    |                       |
                    v                       |
          +---------+------+                |
          | UI (App.tsx)   |                |
          | Shows spinner  |                |
          +----------------+                |
                                            v
                                   +--------+--------+
                                   |  Event Complete |
                                   +--------+--------+
                                            |
                    +-----------------------+-----------------------+
                    |                       |                       |
                    v                       v                       v
          +---------+------+      +---------+------+      +--------+--------+
          | eventBus.emit  |      | eventBus.emit  |      | Permission     |
          | tool:finished  |  OR  | tool:failed    |      | Request (User) |
          +---------+------+      +---------+------+      +--------+--------+
                    |                       |                       |
                    v                       v                       v
              UI update               UI show error          User Decision
            success status                                     → allow/deny
```

### 6.5 Who Listens to What

| Component          | Listens To                   | Reacts With                           |
| ------------------ | ---------------------------- | ------------------------------------- |
| App.tsx (UI)       | app:start, tool:*, stream:*  | Renders screens, shows status bars    |
| ChatScreen.tsx     | stream:*, message:*, tool:*  | Renders chat messages, tool calls     |
| StatusBar.tsx      | tool:started/finished, mcp:* | Shows active tool, MCP count          |
| stateManager       | provider:*, model:*, tool:*  | Updates global state                  |
| Permission Dialog  | permission:request           | Shows permission modal                |
| Question Dialog    | question:request             | Shows question modal                  |

---

## 7. Permission System

### 7.1 File Location

```
src/database/repositories/permissionRepository.ts
```

### 7.2 Database Table

```sql
CREATE TABLE IF NOT EXISTS permissions (
    tool_name TEXT PRIMARY KEY,
    permission TEXT NOT NULL CHECK(permission IN ('always_allow', 'allow_once', 'ask', 'deny')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7.3 Repository Implementation

```typescript
export class PermissionRepository {
  getPermission(toolName: string): PermissionLevel {
    const db = this.getDb();
    const row = db.prepare("SELECT permission FROM permissions WHERE tool_name = ?")
                     .get(toolName) as { permission: string } | undefined;
    if (!row) return 'ask';  // Default: ask user
    return row.permission as PermissionLevel;
  }

  setPermission(toolName: string, permission: PermissionLevel): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO permissions (tool_name, permission, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tool_name) DO UPDATE SET permission = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(toolName, permission, permission);
  }

  listPermissions(): Record<string, PermissionLevel> {
    // Returns all tool permissions as key-value pairs
  }
}
```

### 7.4 Default Seed Permissions

```typescript
// Read-only tools (always_allow — no security risk)
read_file       → always_allow
list_directory  → always_allow
glob            → always_allow
grep            → always_allow

// Modification/execution tools (ask — needs user approval)
write_file      → ask
edit_file       → ask
delete_file     → ask
bash            → ask
git_push        → ask
git_commit      → ask
```

### 7.5 Permission UI Flow

```
AI calls "bash" tool
  │
  ├──> ToolManager.verifyPermission("bash")
  │     │
  │     ├──> DB query: permission for "bash" → "ask"
  │     │
  │     ├──> eventBus.emit('permission:request', {
  │     │     toolName: "bash",
  │     │     args: { command: "rm -rf /" },
  │     │     resolve: callback
  │     │   })
  │     │
  │     ├──> App.tsx listens to 'permission:request'
  │     │     → Shows permission modal in terminal UI
  │     │     → Options: [Always Allow] [Allow Once] [Deny]
  │     │
  │     ├──> User selects "Allow Once"
  │     │     → resolve('allow_once') called
  │     │     → Tool returns true
  │     │
  │     └──> bash tool executes
```

---

## 8. Database Schema

### 8.1 File Location

```
src/database/schema.sql
```

### 8.2 Complete Schema

```sql
-- File: src/database/schema.sql (271 lines total)
-- Technology: SQLite with WAL mode

-- 1. Providers
CREATE TABLE providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    latency INTEGER DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Models (linked to providers)
CREATE TABLE models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    supports_streaming BOOLEAN DEFAULT 1,
    supports_tools BOOLEAN DEFAULT 0,
    supports_reasoning BOOLEAN DEFAULT 0,
    supports_vision BOOLEAN DEFAULT 0,
    supports_json BOOLEAN DEFAULT 0,
    max_context INTEGER DEFAULT 4096,
    max_output INTEGER DEFAULT 2048,
    favorite BOOLEAN DEFAULT 0,
    enabled BOOLEAN DEFAULT 1,
    FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE(provider_id, model_id)
);

-- 3. Agents
CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    prompt TEXT NOT NULL,
    reasoning_level INTEGER DEFAULT 0,
    temperature REAL DEFAULT 0.7,
    default_skills TEXT,        -- JSON Array of skill IDs
    allowed_tools TEXT,         -- JSON Array of tool names
    enabled BOOLEAN DEFAULT 1,
    built_in BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Skills
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT,
    description TEXT,
    priority INTEGER DEFAULT 100,
    path TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    built_in BOOLEAN DEFAULT 0
);

-- 5. Workspace
CREATE TABLE workspace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    language TEXT,
    framework TEXT,
    package_manager TEXT,
    git_branch TEXT,
    last_scan TIMESTAMP
);

-- 6. Sessions
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    provider_id INTEGER,
    model_id INTEGER,
    agent_id INTEGER,
    workspace_id INTEGER,
    summary TEXT,
    favorite BOOLEAN DEFAULT 0,
    archived BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    FOREIGN KEY(model_id) REFERENCES models(id) ON DELETE SET NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspace(id) ON DELETE SET NULL
);

-- 7. Messages
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT,
    reasoning_content TEXT,
    tool_calls TEXT,           -- JSON structure
    tool_call_id TEXT,
    token_input INTEGER DEFAULT 0,
    token_output INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 8. Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,  -- JSON-encoded
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Permissions
CREATE TABLE permissions (
    tool_name TEXT PRIMARY KEY,
    permission TEXT NOT NULL CHECK(permission IN ('always_allow', 'allow_once', 'ask', 'deny')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tools (Tool Registry in DB)
CREATE TABLE tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    plugin TEXT,
    enabled BOOLEAN DEFAULT 1,
    version TEXT DEFAULT '1.0.0'
);

-- 11. Tool Logs
CREATE TABLE tool_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool TEXT NOT NULL,
    arguments TEXT,    -- JSON parameters
    status TEXT NOT NULL CHECK(status IN ('success', 'failure')),
    duration INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. MCP Servers
CREATE TABLE mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    transport TEXT NOT NULL CHECK(transport IN ('stdio', 'http', 'https', 'sse')),
    command TEXT,                    -- Command for stdio transport
    arguments TEXT,                  -- JSON Array for stdio
    url TEXT,                        -- URL for http/https/sse
    environment TEXT,                -- JSON Object of env vars
    status TEXT DEFAULT 'disconnected',
    enabled BOOLEAN DEFAULT 1,
    auto_connect BOOLEAN DEFAULT 1
);

-- 13. Plugins
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    author TEXT,
    description TEXT,
    enabled BOOLEAN DEFAULT 1,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Themes
CREATE TABLE themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT,
    version TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    dark_mode BOOLEAN DEFAULT 1
);

-- 15. Favorites
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('model', 'command', 'skill', 'agent', 'session')),
    item_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, item_id)
);

-- 16. History
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,  -- 'commands', 'models', 'providers', 'files', 'sessions'
    item_id TEXT NOT NULL,
    metadata TEXT,       -- JSON encoded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Cache
CREATE TABLE cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- 18. Bookmarks
CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('message', 'file', 'session')),
    item_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, item_id)
);

-- 19. Attachments
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    message_id INTEGER,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 20. Statistics
CREATE TABLE statistics (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8.3 Database Connection Management

```typescript
// src/database/connection.ts
// Singleton pattern — only one DB instance throughout the app

let dbInstance: DatabaseSync | null = null;

export function initDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;  // Return existing instance

  const dbPath = path.join(os.homedir(), '.openchat', 'openchat.db');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schemaSql);  // Load schema.sql

  seedDefaults(db);    // Insert initial data if empty

  dbInstance = db;
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
```

---

## 9. State Management

### 9.1 File Location

```
src/core/state.ts
```

### 9.2 AppState Interface

```typescript
interface AppState {
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
  isUpdateAvailable: boolean;
  latestVersion: string | null;
}
```

### 9.3 StateManager Implementation

```typescript
class StateManager {
  private state: AppState = { ...defaultState };
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    // Auto-subscribe to events
    eventBus.on('provider:changed', (p) => this.setState({ activeProviderId: p.providerId }));
    eventBus.on('model:changed', (p) => this.setState({ activeModelId: p.modelId }));
    eventBus.on('session:loaded', (p) => this.setState({ activeSessionId: p.sessionId }));
    eventBus.on('tool:started', (p) => this.setState({ activeToolName: p.toolName }));
    eventBus.on('tool:finished', () => this.setState({ activeToolName: null }));
    eventBus.on('tool:failed', () => this.setState({ activeToolName: null }));
  }

  getState(): AppState { return { ...this.state }; }
  setState(updates: Partial<AppState>): void { /* merge + notify */ }
  subscribe(listener): () => void { /* add + return unsubscribe */ }
  reset(): void { /* restore defaults */ }
}

export const stateManager = new StateManager();  // Singleton
```

### 9.4 State Change Flow

```
Event Bus Event
  │
  ├──> eventBus.emit('model:changed', { modelId: 'gpt-4', providerId: 1 })
  │
  ├──> StateManager constructor listener fires
  │     setState({ activeModelId: 'gpt-4', activeProviderId: 1 })
  │
  ├──> State changed → notify all subscribers
  │     listeners.forEach(listener => listener(newState))
  │
  └──> React UI re-renders (App.tsx subscribes)
```

---

## 10. Context Builder & Prompt Engineering

### 10.1 File Location

```
src/core/contextBuilder.ts
```

### 10.2 What it Does

`ContextBuilder.buildSystemPrompt()` generates the **complete system prompt** that is sent to the AI model before every conversation. This prompt contains:

1. **Core Identity** — "You are OpenChat CLI — a professional, fullscreen terminal-native AI coding agent..."
2. **Active Agent Persona** — If an agent is active, its prompt is injected
3. **Workspace Metadata** — Current path, project type, git branch, tsconfig detection
4. **Tool Catalog** — Complete list of available tools with descriptions (grouped by category)
5. **Persistent Memory** — Recent sessions context (last 3 sessions, last user/AI messages)
6. **Skills Context** — All loaded workspace skills

### 10.3 Tool Catalog Injection

```typescript
// System prompt e 40+ tools er catalog inject kora hoy
// Grouped by category for better AI understanding
prompt += `File:
  • read: Read files with line-number pagination...
  • write: Create or overwrite files...
  • edit: String-based find-and-replace...
  • grep: Regex content search...
  • glob: Pattern-based file name search...

Shell:
  • bash: Execute shell commands...
  • spawn_process: Start long-running background process...
  ...

Web:
  • webfetch: Fetch URL content...
  • websearch: General web search...
  • websearch_cited: Grounded web search with citations...
  ...

Agent:
  • delegate: Delegate work to background sub-agent...
  • task: Launch autonomous AI agent...
  ...

Skills:
  • skill: Load specialized skill instructions...
  • skill_find: Search available skills...
  ...
`
```

### 10.4 Tool Usage Rules (Injected in Prompt)

```
TOOL USAGE RULES:
- Always READ files before editing them
- Use grep/glob to find files instead of guessing paths
- Use sequential_thinking for non-trivial decisions
- Use todowrite to track multi-step implementation
- Use type_check after editing TypeScript files
- Prefer parallel tool calls when independent
- Use websearch for real-time information
- Use delegate for parallel sub-tasks; task for complex goals
```

---

## 11. API Engine & AI Communication

### 11.1 File Location

```
src/api/apiEngine.ts
```

### 11.2 Architecture

ApiEngine hocche **bridge between OpenCode and AI providers** (OpenAI, Anthropic, etc.). Ei class OpenAI-compatible API endpoint e HTTP request pathaye.

```typescript
export class ApiEngine {
  // Test provider connection
  static async testConnection(baseUrl: string, apiKey: string): Promise<{...}>

  // Main chat completion method
  static async chatCompletion(options: ChatRequestOptions): Promise<ChatResponse>
}
```

### 11.3 Chat Request Flow

```typescript
static async chatCompletion(options: ChatRequestOptions): Promise<ChatResponse> {
  const { provider, model, messages, systemPrompt, temperature, maxTokens, tools, signal, stream } = options;

  // 1. Build OpenAI-compatible payload
  const payload = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_calls ? { tool_calls: parseToolCalls(msg.tool_calls) } : {}),
        ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
      }))
    ],
    temperature: temperature ?? 0.7,
    stream,
    ...(tools?.length ? { tools } : {}),     // Function-calling tools schema
    ...(maxTokens ? { max_tokens: maxTokens } : {})
  };

  // 2. Send HTTP POST to {base_url}/chat/completions
  //    Header: Authorization: Bearer {api_key}

  if (!stream) {
    // Non-streaming: await full response
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tool_calls: data.choices[0].message.tool_calls
    };
  } else {
    // Streaming: SSE (Server-Sent Events) parsing
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          const data = JSON.parse(dataStr);
          const delta = data.choices[0].delta;

          if (delta?.content) {
            fullContent += delta.content;
            // Emit token events for UI (throttled to ~16fps)
            eventBus.emit('stream:token', { token: delta.content });
          }

          if (delta?.tool_calls) {
            // Accumulate streaming tool call arguments
            accumulateToolCalls(delta.tool_calls);
          }
        }
      }
    }

    return {
      content: fullContent,
      tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined
    };
  }
}
```

### 11.4 Streaming Token Emission

```typescript
// Batching mechanism to prevent terminal flicker
let batchedContentToken = '';
let lastEmitTime = Date.now();
const emitIntervalMs = 60;  // ~16 FPS

// Periodically emit batched tokens
if (Date.now() - lastEmitTime > emitIntervalMs && batchedContentToken) {
  eventBus.emit('stream:token', { token: batchedContentToken });
  batchedContentToken = '';
  lastEmitTime = Date.now();
}

// Final flush on completion
if (batchedContentToken) {
  eventBus.emit('stream:token', { token: batchedContentToken });
}
```

---

## 12. Complete Execution Flow

### 12.1 Full Round Trip: User Input → AI Response

```
User types: "src folder e ki ki file ache?"

  │
  ├──> [1] UI Input Capture (App.tsx / ChatScreen.tsx)
  │     │  User input → session.message add → API call trigger
  │     │
  ├──> [2] ContextBuilder.buildSystemPrompt()
  │     │  → Tool catalog inject
  │     │  → Agent persona inject
  │     │  → Workspace metadata inject
  │     │  → Skills inject
  │     │  → Memory inject
  │     │
  ├──> [3] ApiEngine.chatCompletion()
  │     │  → HTTP POST to AI provider
  │     │  → Payload: { model, messages: [system prompt + user msg], tools: [schemas], stream: true }
  │     │
  ├──> [4] AI Provider processes
  │     │  → Sees "list_directory" tool in catalog
  │     │  → Decides: call list_directory({path: "src"})
  │     │  → Returns: function_call in stream
  │     │
  ├──> [5] Streaming response parsing
  │     │  → SSE lines parsed
  │     │  → tool_calls accumulated
  │     │
  ├──> [6] ToolManager.executeTool("list_directory", {path: "src"})
  │     │
  │     ├──> [6a] PermissionRepository.getPermission("list_directory")
  │     │     → "always_allow" (read-only, safe)
  │     │     → Proceed
  │     │
  │     ├──> [6b] eventBus.emit('tool:started', ...)
  │     │     → StatusBar shows "Running list_directory..."
  │     │
  │     ├──> [6c] Execute handler
  │     │     → fs.readdirSync("src")
  │     │     → Format output
  │     │
  │     └──> [6d] eventBus.emit('tool:finished', {result, duration})
  │           → StatusBar clears
  │
  ├──> [7] Tool result sent back to AI
  │     → message.role = "tool"
  │     → content = "src/ contains: index.ts, core/, tools/, mcp/, ..."
  │
  ├──> [8] AI processes tool result
  │     → Generates final text response
  │     → "src folder e ei file gula ache: index.ts, api/, core/, ..."
  │
  └──> [9] UI renders final response
        → ChatScreen shows AI message
```

### 12.2 Streaming + Tool Call Flow

```
AI Response Stream:
  ┌─────────────────────────────────────────────────────────────────┐
  │ data: {"choices":[{"delta":{"content":"Let me check the src     │
  │ data: {"choices":[{"delta":{"content":" folder for you..."     │
  │ data: {"choices":[{"delta":{"tool_calls":[{"index":0,          │
  │   "id":"call_123","function":{"name":"list_directory",          │
  │   "arguments":"{\"path\":\"src\"}"}}]}}]                       │
  │ data: [DONE]                                                    │
  └─────────────────────────────────────────────────────────────────┘

  UI shows streaming text: "Let me check the src folder for you..."
  
  Tool call detected → Stop showing text → Execute tool
  Tool result received → Send back to AI → Continue streaming
```

### 12.3 Multi-Tool Parallel Execution Pattern

```typescript
// AI can call multiple tools in parallel!
// Example AI decision:
// "Ami ei file gula simultaneously read korbo"

// AI sends in one response:
tool_calls: [
  { name: "read", args: { path: "package.json" } },
  { name: "read", args: { path: "tsconfig.json" } },
  { name: "glob", args: { pattern: "src/**/*.ts" } }
]

// ToolManager executes each independently
// Results returned together to AI
```

---

## 13. Application Startup Flow

### 13.1 Entry Point

**File:** `src/index.ts`

```typescript
async function main() {
  const engine = new AppEngine();

  // Handle CLI flags
  if (process.argv.includes('--uninstall')) { /* uninstall */ }
  if (process.argv.includes('--clean')) { /* clean DB */ }

  // Hook UI render to app:start event
  eventBus.on('app:start', () => {
    render(React.createElement(App));  // React Ink renders terminal UI
  });

  await engine.start();
}
```

### 13.2 AppEngine.start() Sequence

```typescript
class AppEngine {
  async start(): Promise<void> {
    // 1. Initialize SQLite database
    this.db = initDatabase();

    // 2. Hook process signals for clean exit
    process.on('SIGINT', () => this.exit(0));
    process.on('SIGTERM', () => this.exit(0));
    process.on('exit', () => {
      McpManager.disconnectAll();    // Kill all MCP subprocesses
      closeDatabase();               // Close SQLite
    });

    // 3. REGISTER ALL TOOLS
    registerBuiltInTools();
    //   ├── Built-in tools (index.ts)  → read, write, edit, bash, git...
    //   ├── Extended tools (extendedTools.ts) → grep, glob, delegate, skill...
    //   └── Native tools (nativeTools.ts) → view_file, run_command, search_web...

    // 4. Initialize workspace
    this.initWorkspace();
    //   → DB insert/update workspace record
    //   → stateManager.setState({ activeWorkspaceId, workspacePath })

    // 5. Load settings from DB
    this.loadSettings();

    // 6. Load active provider & model
    this.loadActiveModel();
    //   → DB query default provider
    //   → DB query first enabled model
    //   → stateManager.setState({ activeProviderId, activeModelId })

    // 7. Check for updates (async)
    this.checkForUpdates();

    // 8. INITIALIZE MCP SERVERS
    await McpManager.init();
    //   → DB query enabled auto-connect servers
    //   → For each: spawn subprocess → initialize → tools/list → register

    // 9. EMIT START EVENT (UI renders)
    eventBus.emit('app:start', undefined);
  }
}
```

### 13.3 Startup Sequence Diagram (Visual)

```
npm start (or node dist/index.js)
  │
  ├──> src/index.ts: main()
  │     ├──> new AppEngine()
  │     ├──> eventBus.on('app:start', () => render(<App/>))
  │     └──> engine.start()
  │
  ├──> AppEngine.start()
  │     ├──> [DB]     initDatabase() → SQLite open + schema + seed
  │     ├──> [TOOLS]  registerBuiltInTools()
  │     │     ├──> built-in: read, write, edit, bash, git, spawn_process...
  │     │     ├──> extended: grep, glob, webfetch, websearch, delegate, skill...
  │     │     └──> native: view_file, run_command, search_web, generate_image...
  │     ├──> [WS]     initWorkspace()
  │     ├──> [SET]    loadSettings()
  │     ├──> [MODEL]  loadActiveModel()
  │     ├──> [UPD]    checkForUpdates()
  │     ├──> [MCP]    McpManager.init()
  │     │     ├──> spawn context7 server
  │     │     ├──> spawn figma server
  │     │     ├──> spawn github server
  │     │     ├──> spawn shadcn server
  │     │     ├──> spawn magic_ui server
  │     │     ├──> spawn tailwindcss server
  │     │     ├──> spawn filesystem server
  │     │     └──> ... (all enabled MCP servers)
  │     └──> [READY] eventBus.emit('app:start')
  │
  └──> React Ink renders <App/>
        └──> HomeScreen → ChatScreen → AI interaction begins
```

### 13.4 Clean Shutdown

```typescript
exit(code: number = 0): void {
  eventBus.emit('app:exit', undefined);     // Notify all components
  McpManager.disconnectAll();               // Kill all MCP subprocesses
  closeDatabase();                           // Close SQLite safely
  process.exit(code);
}
```

---

## 14. How to Create a New Tool

### 14.1 Simple Tool Registration

```typescript
// Step 1: Go to any register function (index.ts, nativeTools.ts, or extendedTools.ts)
// Step 2: Add a new ToolManager.registerTool() call

ToolManager.registerTool({
  name: 'weather_current',           // Tool name (unique, snake_case)
  description: [                     // AI-friendly description
    'Get current weather for a city.',
    'Returns temperature, humidity, and conditions.',
    'Use open-meteo API for free weather data.'
  ].join(' '),
  parameters: {                      // JSON Schema for function-calling
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name (e.g., "Dhaka", "London")'
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit'
      }
    },
    required: ['city']               // Required parameters
  }
}, async (args) => {                 // Execute handler
  // Your logic here
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=23.8&longitude=90.4&current_weather=true`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  return `Current weather in ${args.city}: ${data.current_weather.temperature}°C`;
});
```

### 14.2 Tool Security Best Practices

```typescript
// 1. ALWAYS use getSafePath() for file operations
const safePath = getSafePath(args.path, args.explicit_permission);

// 2. LOG all tool executions for audit
logToolExecution(toolName, args, 'success', duration);

// 3. Use permission levels wisely
//    Read-only → always_allow (default)
//    Write/exec → ask (default)

// 4. Handle errors gracefully
try {
  // tool logic
} catch (err: any) {
  logToolExecution(toolName, args, 'failure', duration);
  throw new Error(`Weather tool failed: ${err.message}`);
}
```

### 14.3 Tool Name Convention

- **Built-in tools**: Simple namespaced (e.g., `read`, `write`, `bash`)
- **Extended tools**: Snake case (e.g., `websearch_cited`, `sequential_thinking`)
- **MCP tools**: Server prefix (e.g., `figma_get_figma_data`, `github_create_issue`)

---

## 15. How to Create an MCP Server

### 15.1 MCP Server Specification (External Process)

An MCP server is a **standalone process** that communicates via **JSON-RPC 2.0** over **stdin/stdout**.

**Minimum protocol implementation:**

```javascript
// example-mcp-server.js (Node.js)
// This is an external script, NOT part of OpenCode

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

// Handle incoming JSON-RPC messages
rl.on('line', (line) => {
  const request = JSON.parse(line);

  switch (request.method) {
    case 'initialize':
      // Respond with capabilities
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}  // This server provides tools
          },
          serverInfo: { name: 'my-custom-server', version: '1.0.0' }
        }
      }) + '\n');
      break;

    case 'tools/list':
      // List available tools
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [{
            name: 'my_tool',
            description: 'My custom tool description',
            inputSchema: {
              type: 'object',
              properties: {
                param1: { type: 'string', description: 'First parameter' }
              },
              required: ['param1']
            }
          }]
        }
      }) + '\n');
      break;

    case 'tools/call':
      // Execute a tool
      const { name, arguments: args } = request.params;
      let result;

      if (name === 'my_tool') {
        result = `Hello, ${args.param1}!`;
      }

      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [{ type: 'text', text: result }]
        }
      }) + '\n');
      break;
  }
});
```

### 15.2 Register in OpenCode Database

```sql
-- Insert MCP server config
INSERT INTO mcp_servers (name, description, transport, command, arguments, enabled, auto_connect)
VALUES (
  'my_custom_server',
  'My custom MCP server',
  'stdio',
  'node',
  '["/path/to/example-mcp-server.js"]',
  1,  -- enabled
  1   -- auto_connect
);
```

### 15.3 MCP Protocol Message Flow

```
OpenCode → MCP Server:
  {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"OpenChat CLI","version":"1.0"}},"id":1}

MCP Server → OpenCode:
  {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"my-custom-server","version":"1.0.0"}}}

OpenCode → MCP Server:
  {"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}

MCP Server → OpenCode:
  {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"my_tool","description":"...","inputSchema":{...}}]}}

OpenCode → MCP Server (when AI calls my_tool):
  {"jsonrpc":"2.0","method":"tools/call","params":{"name":"my_tool","arguments":{"param1":"hello"}},"id":3}

MCP Server → OpenCode:
  {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Hello!"}]}}
```

---

## 16. How to Create a Skill

### 16.1 Skill File Structure

```
~/.openchat/skills/my-custom-skill/
  └── SKILL.md              <-- Main instructions (required)
  └── templates/             <-- Resource files (optional)
  └── examples/              <-- Example files (optional)
```

### 16.2 SKILL.md Format

```markdown
# My Custom Skill

## Purpose
Ei skill ta [specific domain] er jonno best practices provide kore.

## Key Principles
1. Principle one: specific guideline
2. Principle two: specific guideline
3. Principle three: specific guideline

## Coding Standards
- Use TypeScript strict mode
- Always handle errors with Result type
- Prefer functional patterns

## Architecture Patterns
- Use layered architecture: controller → service → repository
- Dependency injection for testability
- Event-driven for loose coupling

## Common Pitfalls
- Avoid circular dependencies
- Never use `any` type
- Don't forget error boundaries

## Example
```typescript
// Good pattern
export class UserService {
  constructor(private repo: UserRepository) {}
  async getUser(id: string): Promise<Result<User, Error>> {
    // ...
  }
}
```
```

### 16.3 Skill Activation

AI automatically activates skills when needed via:
```typescript
skill("my-custom-skill")     // Single skill
skill_use(["skill1", "skill2"])  // Multiple skills
```

---

## 17. Agent System

### 17.1 Database Schema

```sql
CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,     -- e.g., "General", "Debugger"
    description TEXT,
    icon TEXT,
    prompt TEXT NOT NULL,          -- System prompt for this agent
    reasoning_level INTEGER DEFAULT 0,
    temperature REAL DEFAULT 0.7,
    default_skills TEXT,           -- JSON Array of skill IDs
    allowed_tools TEXT,            -- JSON Array of tool names
    enabled BOOLEAN DEFAULT 1,
    built_in BOOLEAN DEFAULT 0
);
```

### 17.2 Built-in Agents

```typescript
// Seeded in database
insertAgent.run(
  'General',
  'A versatile general-purpose development assistant.',
  '[Agent]',
  'You are a highly skilled software development assistant...',
  0, 0.7,
  JSON.stringify([]),           // No default skills
  JSON.stringify(['read_file', 'write_file', 'edit_file', 'bash', ...]),  // Allowed tools
  1, 1                          // enabled, built_in
);

insertAgent.run(
  'Debugger',
  'Specialized in reading logs, stack traces, and fixing bugs.',
  '[Bug]',
  'You are a debugging expert. Your primary goal is to find, analyze, and fix bugs...',
  0, 0.2,                       // Lower temperature for deterministic debugging
  JSON.stringify([]),
  JSON.stringify(['read_file', 'grep', 'bash']),  // Focused tool set
  1, 1
);
```

### 17.3 Agent Activation

When an agent is active, its prompt is injected into the system prompt:

```typescript
// In ContextBuilder.buildSystemPrompt()
if (activeAgentId) {
  const agent = agentRepo.getAgent(activeAgentId);
  if (agent) {
    prompt += `\n[Active Agent Persona: ${agent.name}]\n${agent.prompt}\n`;
  }
}
```

---

## 18. Subagent & Delegation System

### 18.1 Subagent Definitions (Extended Tools)

```typescript
const agentSystemPrompts = {
  'architect': 'You are a software architect. Analyze the request and provide high-level system design, trade-offs, and architectural recommendations.',
  'backend-dev': 'You are a senior backend developer. Implement robust, production-ready server-side code with proper error handling.',
  'code-reviewer': 'You are a thorough code reviewer. Analyze code for bugs, security issues, performance problems, and maintainability.',
  'database-optimizer': 'You are a database expert. Optimize queries, design schemas, and improve database performance.',
  'debug': 'You are a debugging expert. Systematically identify root causes of issues and provide detailed fix instructions.',
  'devops-engineer': 'You are a DevOps engineer. Handle CI/CD, deployment, infrastructure, and container orchestration.',
  'explore': 'You are a codebase explorer. Quickly map out project structure, patterns, and key relationships.',
  'frontend-ui': 'You are a frontend developer specializing in UI/UX. Create beautiful, accessible, performant user interfaces.',
  'general': 'You are a helpful AI assistant. Handle the task thoroughly and provide a complete response.',
  'performance-optimizer': 'You are a performance engineer. Profile, identify bottlenecks, and optimize code for speed and efficiency.',
  'security-auditor': 'You are a security expert. Audit code for vulnerabilities, injection risks, auth flaws, and OWASP top 10.',
  'tdd-dev': 'You are a TDD practitioner. Write failing tests first, then implement code to make them pass. Follow Red-Green-Refactor.'
};
```

### 18.2 Subagent Execution Flow (Native Tools)

```typescript
// nativeTools.ts — invoke_subagent implementation
for (const sub of args.Subagents) {
  const conversationId = `conv_${Date.now()}_${random}`;

  // Store subagent session
  subagentStore.set(conversationId, { status: 'running', ... });

  // Execute asynchronously
  setImmediate(async () => {
    const { ApiEngine } = await import('../../api/apiEngine.js');

    const systemPrompt = subagentDefinitions.get(sub.TypeName)?.system_prompt
      || 'You are a general assistant.';

    const response = await ApiEngine.chatCompletion({
      provider, model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...session.messages
      ],
      stream: false
    });

    session.status = 'completed';
    session.result = response.content;

    // Notify parent
    eventBus.emit('subagent:finished', { conversationId, result: session.result });
  });
}
```

### 18.3 Delegation In-Memory Store

```typescript
// In-memory storage (not persisted to DB)
const delegationStore = new Map<string, {
  agent: string;
  prompt: string;
  status: 'running' | 'completed' | 'failed';
  result: string;
  startedAt: number;
  taskId: string;
}>();

const subagentStore = new Map<string, SubagentSession>();
```

---

## 19. Theme System

### 19.1 File Location

```
src/core/constants.ts  (BUILT_IN_THEMES — 72 themes)
src/ui/theme/themeManager.ts
```

### 19.2 Theme Structure

```typescript
interface Theme {
  id: string;
  name: string;
  author: string;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
  backgroundColor: string;
}
```

### 19.3 Available Themes

72 ta built-in theme available, including popular color schemes:

| Theme Family         | Variants                                   |
| -------------------- | ------------------------------------------ |
| TokyoNight           | light, dark                                |
| Catppuccin           | light, dark, frappe-dark, macchiato-dark   |
| Dracula              | light, dark                                |
| Nord                 | light, dark                                |
| Gruvbox              | light, dark                                |
| Solarized            | light, dark                                |
| One Dark             | light, dark, pro-light, pro-dark           |
| GitHub               | light, dark                                |
| Vercel               | light, dark                                |
| Material             | light, dark                                |
| Rose Pine            | light, dark                                |
| Monokai              | light, dark                                |
| Synthwave 84         | light, dark                                |
| AMOLED               | light, dark                                |
| Everforest           | light, dark                                |
| Kanagawa             | light, dark                                |
| Aurora               | light, dark                                |
| Ayu                  | light, dark                                |
| And many more...     |                                            |

### 19.4 Slash Commands

```typescript
const BUILT_IN_COMMANDS = [
  '/update latest',       // Fetch and update to latest version
  '/provider api',        // Add new API provider
  '/providers',           // List and manage providers
  '/add model',           // Add model to provider
  '/all models',          // Switch between models
  '/agents',              // List and switch agents
  '/skills',              // Manage skills
  '/history',             // View session history
  '/settings',            // Configure appearance, tools, behavior
  '/themes',              // Switch between 72 color themes
  '/tools',               // Browse all registered tools
  '/permissions',         // Manage per-tool permissions
  '/mcp',                 // Manage MCP servers
  '/help',                // Show manual
  '/uninstall',           // Uninstall OpenChat
  '/backup',              // Backup credentials
  '/restore',             // Restore credentials
  '/exit'                 // Cleanly exit
];
```

---

## 20. All Source Files Map

### 20.1 Core Files

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/index.ts`                         | Application entry point                     |
| `src/core/engine.ts`                   | AppEngine - startup, lifecycle, update      |
| `src/core/events.ts`                   | TypedEventBus - pub/sub system              |
| `src/core/state.ts`                    | StateManager - global state                 |
| `src/core/contextBuilder.ts`           | System prompt builder                       |
| `src/core/constants.ts`                | Constants, themes (72), commands            |

### 20.2 Tool System Files

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/tools/toolManager.ts`             | Central tool registry                       |
| `src/tools/impl/index.ts`              | Built-in tools + register function          |
| `src/tools/impl/nativeTools.ts`        | Native platform tools (20)                  |
| `src/tools/impl/extendedTools.ts`      | Extended tools (grep, web, skill, etc.)     |

### 20.3 MCP System

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/mcp/mcpManager.ts`                | MCP server connection management            |

### 20.4 Skills System

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/skills/skillsManager.ts`          | Skill loading and prompt injection           |

### 20.5 Database

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/database/connection.ts`           | SQLite connection, init, seed               |
| `src/database/schema.sql`              | Complete database schema (20 tables)        |
| `src/database/repositories/`           | Data access layer (7 repositories)          |

### 20.6 API Communication

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/api/apiEngine.ts`                 | AI provider communication (stream + non-stream) |

### 20.7 UI Files

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/ui/App.tsx`                       | Main React Ink application component        |
| `src/ui/screens/ChatScreen.tsx`        | Chat interface                              |
| `src/ui/screens/HomeScreen.tsx`        | Home/Welcome screen                         |
| `src/ui/screens/Dialogs.tsx`           | Permission/Question dialogs                 |
| `src/ui/components/StatusBar.tsx`      | Status bar                                  |
| `src/ui/components/CommandPalette.tsx` | Command palette                             |
| `src/ui/theme/themeManager.ts`         | Theme management                            |

### 20.8 Types

| File Path                              | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/types/index.ts`                   | TypeScript type definitions                  |

---

## Appendix: Key Technical Details

### A.1 Tool Registration Count (Approximate)

| Layer    | Tool Count | Source                         |
| -------- | ---------- | ------------------------------ |
| Built-in | ~18        | `src/tools/impl/index.ts`      |
| Extended | ~30+       | `src/tools/impl/extendedTools.ts` |
| Native   | ~20        | `src/tools/impl/nativeTools.ts`   |
| MCP      | Dynamic    | External server tools          |

### A.2 Technology Stack

| Technology   | Usage                                      |
| ------------ | ------------------------------------------ |
| TypeScript   | Main programming language                  |
| Node.js      | Runtime environment                        |
| React Ink    | Terminal UI framework (React for terminal) |
| SQLite       | Local database (node:sqlite)               |
| JSON-RPC 2.0 | MCP server communication protocol          |
| SSE          | AI streaming response parsing              |
| EventEmitter | Node.js built-in event system              |

### A.3 Ports & Network

- **No fixed ports** — MCP servers use stdio transport
- **Outbound HTTP/HTTPS** — AI provider API + web search + image generation
- **Database** — Local SQLite file (`~/.openchat/openchat.db`)

### A.4 Security Architecture Summary

```
Layer 1: Workspace Boundary
  → getSafePath() ensures file access is within workspace
  → explicit_permission flag for external access

Layer 2: Permission System
  → 4 permission levels (always_allow, allow_once, ask, deny)
  → Default: read = always_allow, write/exec = ask
  → Stored in SQLite, modifiable via /permissions

Layer 3: Tool Execution Monitoring
  → All tool executions logged to tool_logs table
  → Duration, arguments, status tracked

Layer 4: Process Isolation
  → MCP servers run as separate subprocesses
  → Clean disconnect on app exit
```

---

> **End of Documentation**
>
> Ei dokumentation OpenCode/OpenChat er complete plugin system architecture, implementation details, and execution flow niye likha. Jodi kono question thake, jiggesh korte paren.
