# 🧠 Antigravity — Tool Usage: When, How, Where, Why, If & If Not

> Written by the agent itself as an honest, first-person account of how
> every tool is actually used in practice. This is not a reference manual —
> it is a **decision diary**.

---

## Table of Contents

1. [view_file](#1-view_file)
2. [list_dir](#2-list_dir)
3. [write_to_file](#3-write_to_file)
4. [replace_file_content](#4-replace_file_content)
5. [multi_replace_file_content](#5-multi_replace_file_content)
6. [grep_search](#6-grep_search)
7. [run_command](#7-run_command)
8. [command_status](#8-command_status)
9. [manage_task](#9-manage_task)
10. [read_url_content](#10-read_url_content)
11. [search_web](#11-search_web)
12. [define_subagent](#12-define_subagent)
13. [invoke_subagent](#13-invoke_subagent)
14. [manage_subagents](#14-manage_subagents)
15. [send_message](#15-send_message)
16. [generate_image](#16-generate_image)
17. [schedule](#17-schedule)
18. [ask_question](#18-ask_question)
19. [ask_permission](#19-ask_permission)
20. [list_permissions](#20-list_permissions)
21. [Tool Decision Flow — Mental Model](#21-tool-decision-flow--mental-model)

---

## 1. `view_file`

### What it is
Reads the content of a file from the local filesystem. Returns lines with
line-numbers, supports byte offsets for large files, and can render images and
video natively.

### When I use it
- **Always before editing** — I never modify a file I haven't read first.
  Editing blind causes mismatched `targetContent` and broken patches.
- When I need to understand what a component, function, or config currently
  looks like before reasoning about a change.
- When the user references a file by name and I'm not sure what's in it.
- When a TypeScript / build error points to a specific line — I read that exact
  range first.

### How I use it
```
view_file(path="/abs/path/to/file.ts")             // full file (up to 800 lines)
view_file(path="...", StartLine=50, EndLine=120)   // precise range
view_file(path="...", ContentOffset=46080)         // continue past byte limit
```

### Where it applies
Every directory in the workspace. Also files outside the workspace if the user
has explicitly granted `read_file` permission for that path.

### Why it matters
Without reading first I would fabricate content. Real content = real edits.
The line-number overlay the tool adds lets me write exact `StartLine`/`EndLine`
values for subsequent edits.

### If NOT
If the file is very large (>5000 lines) and I only need a specific function, I
use `grep_search` first to find the line number, then `view_file` with a tight
`StartLine`/`EndLine` range — never loading the whole file unnecessarily.

---

## 2. `list_dir`

### What it is
Lists the immediate children of a directory — files and subdirectories — with
sizes, child counts, and types.

### When I use it
- First thing I do on any new task, to orient myself in the project structure.
- Before creating a new file, to check if it already exists.
- When the user says "go look at my project" without specifying a path.
- To discover where things live (e.g. "which directory holds the components?").

### How I use it
```
list_dir(DirectoryPath="/storage/emulated/0/htdocs/open-chat")
list_dir(DirectoryPath="/storage/emulated/0/htdocs/open-chat/src/ui/components")
```

### Where it applies
Any directory the agent has access to. The tool always returns a flat
one-level listing, so I call it recursively into subdirectories when needed.

### Why it matters
Without a map I'm flying blind. Two `list_dir` calls — root, then relevant
subdirectory — give me the full picture in seconds and prevent creating
duplicate files or writing to the wrong path.

### If NOT
If I already know the exact file path from context (e.g. the user pasted it,
or I've already explored this directory in the same session), I skip `list_dir`
and go straight to `view_file` or `grep_search`.

---

## 3. `write_to_file`

### What it is
Creates a brand new file (and all missing parent directories) and writes
content to it. Will error if the file already exists — unless `Overwrite: true`
is set.

### When I use it
- Creating new source files, components, config files, scripts.
- **Complete rewrites** of existing files where the new content is so different
  that surgical edits would be harder to reason about than a clean slate.
- Writing artifacts (reports, plans, analysis docs) to the artifact directory.

### How I use it
```
write_to_file(
  TargetFile="/path/to/NewComponent.tsx",
  Overwrite=false,          // safe default — fails if file exists
  CodeContent="...",
  ArtifactMetadata={...}    // only for user-facing artifacts
)
```
For complete rewrites of existing files: `Overwrite=true`.

### Where it applies
Anywhere in the workspace. For artifacts specifically, I always write to:
`/data/data/com.termux/files/home/.gemini/antigravity-cli/brain/<conversation-id>/`

### Why it matters
It is the only tool that can create files. Any new feature, new component, new
config — starts here.

### If NOT
If the file already exists and only part of it needs changing, I **never** use
`write_to_file` with `Overwrite=true` to replace the whole file. That destroys
parts that didn't need changing and makes the diff useless. Instead I use
`replace_file_content` or `multi_replace_file_content`.

---

## 4. `replace_file_content`

### What it is
Replaces a **single, contiguous block** of text in an existing file. Requires
an exact `TargetContent` match — character-perfect including whitespace.

### When I use it
- Small, focused changes: fixing one function, updating one import, changing
  one config value.
- When only one contiguous region needs to change.
- When I want the change to be minimal and auditable.

### How I use it
```
replace_file_content(
  TargetFile="/path/to/file.ts",
  StartLine=45,
  EndLine=52,
  TargetContent="  const old = 'value';\n",
  ReplacementContent="  const old = 'newValue';\n",
  AllowMultiple=false     // error if TargetContent appears more than once
)
```

### Where it applies
Any existing text file I've already read. I always set `StartLine`/`EndLine`
to a tight range around the exact occurrence I want — this prevents accidental
replacement of a duplicate string elsewhere in the file.

### Why it matters
It produces a clean, surgical edit. The tool confirms exactly what changed and
shows a diff in its output. Zero risk of accidentally overwriting the whole file.

### If NOT
- If I need to change **two or more non-adjacent regions**: I use
  `multi_replace_file_content` instead (single call, multiple chunks).
- If the `TargetContent` string appears more than once and both need changing:
  I either use `AllowMultiple=true` or split into separate calls with tighter
  line ranges.
- If the file needs to be completely rewritten: `write_to_file` with
  `Overwrite=true`.

---

## 5. `multi_replace_file_content`

### What it is
Like `replace_file_content` but accepts an array of `ReplacementChunks` —
multiple non-adjacent regions edited in a **single tool call**.

### When I use it
- When a feature change touches 3+ separate spots in the same file.
- When I need to update imports AND update the component body AND update the
  export — all in one atomic operation.
- To avoid making multiple sequential calls to the same file (which is wasteful
  and increases the chance of an intermediate state being wrong).

### How I use it
```
multi_replace_file_content(
  TargetFile="/path/to/App.tsx",
  ReplacementChunks=[
    { StartLine:1, EndLine:5,   TargetContent:"...", ReplacementContent:"..." },
    { StartLine:88, EndLine:95, TargetContent:"...", ReplacementContent:"..." },
    { StartLine:200, EndLine:210, TargetContent:"...", ReplacementContent:"..." },
  ]
)
```

### Where it applies
Anywhere `replace_file_content` applies, but when the edit footprint spans
multiple non-adjacent blocks.

### Why it matters
Fewer tool calls = less latency, less chance of intermediate corruption, and
a cleaner audit trail. The tool applies all chunks atomically.

### If NOT
If all the changes are in one contiguous region, `replace_file_content` is
simpler and I prefer it. If the file needs a full rewrite, `write_to_file` wins.

---

## 6. `grep_search`

### What it is
Runs `ripgrep` over files or directories, returning matching lines with file
names and line numbers. Supports regex and literal string patterns, with glob
file filters.

### When I use it
- **Codebase navigation** — finding where a function/class/variable is defined
  or used, without reading every file.
- **Before editing** — confirming a `TargetContent` string appears exactly once
  (or N times) before I attempt a replacement.
- **Impact analysis** — "where does this function get called?" before refactoring.
- Finding all occurrences of a deprecated API, an old import path, a specific
  config key.
- Quickly locating the line number to feed into `view_file` for a tight range.

### How I use it
```
// Literal search
grep_search(SearchPath="/project/src", Query="handleSubmit", MatchPerLine=true)

// Regex search for import patterns
grep_search(
  SearchPath="/project/src",
  Query="^import.*from ['\"]react['\"]",
  IsRegex=true,
  MatchPerLine=true,
  Includes=["*.ts", "*.tsx"]
)

// File-level only (which files contain this string)
grep_search(SearchPath="/project", Query="TODO:", MatchPerLine=false)
```

### Where it applies
Any directory in the workspace. Glob `Includes` let me narrow to specific file
types so results stay manageable (capped at 50 matches).

### Why it matters
It is orders of magnitude faster than opening every file. A grep can survey
hundreds of files in milliseconds and return exactly the lines I care about.

### If NOT
If I already know exactly which file and line I need, I skip grep and go
straight to `view_file`. If the search is about semantics (e.g. "how does this
feature work conceptually?"), grep can't help — I need to read the code.

---

## 7. `run_command`

### What it is
Proposes and executes shell commands on the user's Linux/bash environment. Can
run synchronously (blocking) or be sent to the background as a persistent
task. Persistent terminals share environment variables across calls.

### When I use it
- **Build & compile**: `npm run build`, `tsc --noEmit`, `cargo build`
- **Test**: `npm test`, `pytest`, `jest`
- **Install packages**: `npm install`, `pip install`
- **Git operations**: `git status`, `git log`, `git diff`
- **Validation after edits** — I always build/typecheck after any code change
  to catch errors early.
- **Running the dev server**: `npm run dev` (sent to background)
- One-off shell scripts, file moves, permission changes, etc.

### How I use it
```
// Synchronous (waits up to WaitMsBeforeAsync ms before backgrounding)
run_command(CommandLine="npm run build 2>&1", Cwd="/project", WaitMsBeforeAsync=30000)

// Background (long-running server)
run_command(CommandLine="npm run dev", Cwd="/project", WaitMsBeforeAsync=3000)

// Persistent terminal (share env vars between calls)
run_command(..., RunPersistent=true, RequestedTerminalID="term-1")
```

### Where it applies
The user's Termux/Linux shell. All commands run from the specified `Cwd`.
Never use `cd` as a command — always set `Cwd` instead.

### Why it matters
Code that doesn't compile is useless. Running `tsc --noEmit` after every
non-trivial edit is my own quality gate. I treat the build output as
authoritative feedback and fix errors before reporting success to the user.

### If NOT
- I **never** run commands that download unverified code or make open-ended
  network requests without asking first.
- If a command requires sudo/root, I use `ask_permission` with
  `escalate_admin` first.
- If I'm not sure a destructive command (like `rm -rf`) is correct, I ask the
  user before running it.

---

## 8. `command_status`

### What it is
Polls the current status and output of a **background** command by its task ID.
Returns: running/done, stdout/stderr output, and any error.

### When I use it
- After launching a long-running background command (`npm run build`, `tsc`,
  tests) with a short `WaitMsBeforeAsync`.
- To read output of a background task that finished while I was doing
  something else.
- When I set a `schedule` timer and it fires — I check the background task's
  result at that point.

### How I use it
```
command_status(
  CommandId="486f66fd-.../task-44",
  WaitDurationSeconds=30,       // wait up to 30s for it to finish
  OutputCharacterCount=3000     // only read first 3000 chars to save memory
)
```

### Where it applies
Only for task IDs returned by `run_command` when the command was sent to
background.

### Why it matters
Without this I have no way to know if a background build succeeded or failed.
It closes the feedback loop on async operations.

### If NOT
I do NOT poll in a loop. I call `command_status` once after the system notifies
me the task is done. If I need to wait, I use `schedule` with a
`TimerCondition` matching the task ID, then stop calling tools — the system
will wake me up when the task finishes.

---

## 9. `manage_task`

### What it is
Manage running background tasks: list them, kill one, check its status, or
send stdin input to a running process.

### When I use it
- When a dev server or long process is already running and I need to kill it
  before restarting (e.g. port already in use).
- When a process expects interactive input (e.g. a CLI prompt mid-execution).
- To list all currently running tasks to avoid running duplicate processes.
- When a task appears stuck and I want to terminate it.

### How I use it
```
manage_task(Action="list")
manage_task(Action="kill", TaskId="task-44")
manage_task(Action="send_input", TaskId="task-44", Input="yes\n")
manage_task(Action="status", TaskId="task-44")
```

### Why it matters
It prevents orphaned processes and dangling dev servers. Critical in Termux
where resources are limited.

### If NOT
If a command finished normally I don't need this tool — the system already
notified me. I only reach for it when something is still running and I need
to intervene.

---

## 10. `read_url_content`

### What it is
Fetches a URL via HTTP and converts the HTML to markdown. No JavaScript
execution, no authentication, no cookies. Fast and invisible to the user.

### When I use it
- Reading documentation pages, README files, changelogs, API references.
- Fetching a raw GitHub file URL to see its contents.
- Reading package READMEs on npm/PyPI.
- When `search_web` gives me a URL and I want the full page content.
- Batch-fetching multiple documentation pages in parallel.

### How I use it
```
read_url_content(Url="https://ink-docs.example.com/api/box")
read_url_content(Url="https://raw.githubusercontent.com/user/repo/main/README.md")
```

### Where it applies
Any public HTTP/HTTPS URL that doesn't require login or JavaScript rendering.

### Why it matters
Web docs are the ground truth for library APIs, config formats, and best
practices. Rather than hallucinating an API I'm unsure about, I fetch the
actual docs.

### If NOT
- If the page requires login/auth → it will return a login wall, useless.
- If the page is JavaScript-heavy (SPA) → the markdown will be empty or garbage.
  In those cases I report what I found via `search_web` instead.
- If I need to interact with the page (click buttons, fill forms) → not possible
  with this tool.

---

## 11. `search_web`

### What it is
Performs a web search and returns a synthesized summary of relevant information
plus source URL citations. Accepts an optional `domain` hint to bias results.

### When I use it
- When I'm unsure about something and need current information.
- Finding the npm package name for a library I know conceptually.
- Checking if a known bug has a fix or workaround.
- Looking up error messages I haven't seen before.
- Discovering the latest version of a dependency.
- When the user asks about something outside my training data.

### How I use it
```
search_web(query="ink react terminal box component padding docs", domain="npmjs.com")
search_web(query="TypeError: Cannot read property 'map' of undefined React Ink")
search_web(query="diff algorithm Myers O(ND) javascript implementation")
```

### Why it matters
My training data has a cutoff. The web has the answers to "what's the latest
version?", "is this deprecated?", "what's the fix for this CVE?". Searching
prevents confident wrong answers.

### If NOT
If I'm confident in the answer from training data and the topic is stable
(e.g. how a standard algorithm works), I don't search — it wastes time.
If I need the full text of a page (not just a summary), I follow up with
`read_url_content` on the returned URL.

---

## 12. `define_subagent`

### What it is
Defines a new **custom subagent type** for this conversation — with a name,
description, system prompt, and tool configuration. Once defined it can be
invoked repeatedly via `invoke_subagent`.

### When I use it
- When I need a specialized agent for a recurring sub-task (e.g. a dedicated
  "test runner agent", a "documentation writer agent").
- When I want a subagent with a specific narrow system prompt that makes it
  better at one thing (e.g. only reads code, only writes markdown).
- When neither `research` nor `self` subagent types cover the specialization I need.

### How I use it
```
define_subagent(
  name="diff-reviewer",
  description="Reviews code diffs for correctness and style",
  system_prompt="You are a strict code reviewer. Analyze diffs and report issues...",
  enable_write_tools=false,    // read-only
  enable_subagent_tools=false
)
```

### Why it matters
Custom subagents let me create domain-experts on the fly. A "security auditor"
subagent with a focused prompt will produce better security analysis than a
general agent.

### If NOT
For one-off tasks I don't define a new type — I just `invoke_subagent` with
type `self` or `research`. I only define a new type if I'll invoke it more
than once in the same session.

---

## 13. `invoke_subagent`

### What it is
Spawns one or more subagents (by type name) that run in parallel, each in
their own conversation context, reporting back when done.

### When I use it
- **Parallelism** — when two independent research tasks can run simultaneously
  (e.g. "read the frontend code" AND "read the backend code" at the same time).
- **Isolation** — when a task would pollute my context with too many file reads.
- **Delegation** — long research surveys, broad codebase exploration, writing
  test suites for a module while I work on something else.
- Spawning a `research` subagent to deep-dive documentation while I continue
  building.

### How I use it
```
invoke_subagent(Subagents=[
  {
    TypeName: "research",
    Role: "Frontend Researcher",
    Prompt: "Read all files in /project/src/ui and summarize the component structure..."
  },
  {
    TypeName: "research",
    Role: "Backend Researcher",
    Prompt: "Read all files in /project/src/api and summarize the API architecture..."
  }
])
```

### Workspace modes
| Mode | When to use |
|---|---|
| `inherit` (default) | Shares my workspace — can see the same files |
| `branch` | Isolated copy — safe for experiments that might break things |
| `share` | Shared repo, independent branch (like git worktree) |

### Why it matters
Parallelism is the biggest speedup available. Two research tasks that would
each take 2 minutes can both finish in 2 minutes when run concurrently.

### If NOT
For small, quick lookups I don't spawn a subagent — I just do it myself. The
overhead of spawning isn't worth it for a single `view_file` call. I also
don't spawn subagents for tasks that require tight coordination with my own
live state.

---

## 14. `manage_subagents`

### What it is
Lists all active subagents, kills specific ones, or kills all of them. Killed
subagents' logs and artifacts are preserved, but their branched workspaces are
deleted.

### When I use it
- Listing what subagents are currently running before spawning more.
- Killing a subagent that went off-track or got stuck.
- Cleanup after a parallel task set finishes (kill any stragglers).
- After the user changes direction mid-task — kill the old work, restart fresh.

### How I use it
```
manage_subagents(Action="list")
manage_subagents(Action="kill", ConversationIds=["conv-abc123"])
manage_subagents(Action="kill_all")
```

### If NOT
If subagents are working correctly and I'm just waiting for their messages, I
do NOT poll `list` repeatedly. The system notifies me automatically.

---

## 15. `send_message`

### What it is
Sends a message to another agent (subagent or peer) by its conversation ID.
Used for mid-task instructions, follow-ups, or corrections to a running
subagent.

### When I use it
- Sending follow-up instructions to a subagent that finished one phase and
  needs new directions.
- Correcting a running subagent that misunderstood its initial prompt.
- When two subagents need to coordinate — I act as the message relay.
- Sending a subagent new context it didn't originally have.

### How I use it
```
send_message(
  Recipient="conv-abc123",
  Message="Great work on the component analysis. Now please also check the
           types directory and summarize the shared interfaces..."
)
```

### Why it matters
Subagents aren't fire-and-forget. Complex tasks evolve. `send_message` lets me
steer them without killing and re-spawning, preserving their accumulated context.

### If NOT
I **never** use `send_message` to communicate with the user. That's done by
outputting text in my response. `send_message` is strictly agent-to-agent.

---

## 16. `generate_image`

### What it is
Generates or edits images from a text prompt using an AI image model. Saves
the result as an artifact. Supports passing up to 3 existing images as
references for edits or compositions.

### When I use it
- Creating UI mockups before writing code — show the user what I'm going to
  build, get approval, then implement.
- Generating placeholder images (avatars, hero images, icons) for a web app
  instead of using ugly gray placeholders.
- Creating visual assets: logos, background textures, illustrations.
- Iterating on a design with the user ("make it darker", "add a gradient").
- When the user asks me to build a web app — I generate the design first.

### How I use it
```
generate_image(
  Prompt="Dark glassmorphism chat UI, purple accents, sidebar navigation,
          minimal modern design, high contrast",
  ImageName="chat_ui_mockup",
  AspectRatio="16:9"
)

// Edit an existing image
generate_image(
  Prompt="Make the background darker and add a subtle gradient",
  ImageName="chat_ui_v2",
  ImagePaths=["/path/to/chat_ui_mockup.png"]
)
```

### Why it matters
A picture is worth a thousand words. Showing the user a visual before building
prevents the "that's not what I meant" feedback loop. It also produces real,
usable assets instead of stock photo placeholders.

### If NOT
If the user is building a terminal app (TUI), images aren't relevant to the
UI — I skip this tool. If the user says "just build it, no mockup needed", I
skip the preview and go straight to code.

---

## 17. `schedule`

### What it is
Sets a one-shot timer or a recurring cron job. When the timer fires, I receive
a notification and resume execution. Can be cancelled early if a message
arrives from a specific sender.

### When I use it
- **One-shot timer**: After launching a long background task (build, tests,
  server) with an expected completion time, I set a timer so I'm not idle
  forever if it fails to notify me.
- **Cron**: Polling a deployment, running a health check every N minutes,
  scheduled reminders the user explicitly requested.
- Setting a safety timeout when waiting for a subagent.

### How I use it
```
// Wait up to 5 min for a specific task, cancel early if it reports back
schedule(
  DurationSeconds="300",
  Prompt="Check on the build task status and report results",
  TimerCondition="task-44"   // cancelled if task-44 finishes first
)

// Recurring health check every 10 minutes, max 6 times
schedule(
  CronExpression="*/10 * * * *",
  MaxIterations="6",
  Prompt="Run the health check and report server status"
)
```

### Timer condition options
| Value | Behaviour |
|---|---|
| `never` (default) | Always fires after the duration, unless explicitly cancelled |
| `any` | Cancelled if ANY message arrives before duration |
| `<sender-id>` | Cancelled only if that specific task/subagent reports back |

### Why it matters
Without timers, I'd either poll constantly (wasteful) or sit idle forever
waiting for something that crashed. Timers are the async coordination primitive.

### If NOT
I **never** use `schedule` to wait for something I know will complete quickly.
For a 10-second build, I set `WaitMsBeforeAsync=15000` on `run_command` itself
and it returns synchronously. `schedule` is for tasks that take minutes to hours.

---

## 18. `ask_question`

### What it is
Renders an interactive multiple-choice modal to the user in the UI. Blocks
execution until the user responds. Supports multi-select checkboxes.

### When I use it
- When the user's request is genuinely ambiguous between two meaningfully
  different implementations.
- Choosing between mutually exclusive design options (e.g. framework choice,
  color scheme, feature scope).
- When missing information would cause me to build the wrong thing entirely.
- Collecting user preferences before starting a large task.

### How I use it
```
ask_question(questions=[{
  question: "Which styling approach should I use?",
  options: [
    "(Recommended) Vanilla CSS — maximum control, no dependencies",
    "TailwindCSS — utility-first, requires config",
    "CSS Modules — scoped styles, moderate setup"
  ],
  is_multi_select: false
}])
```

### Why it matters
Making assumptions about ambiguous requirements leads to rework. One question
upfront saves three rounds of "that's not what I meant".

### If NOT
I do NOT ask about trivial things I can reasonably infer. If the user says
"build a dark theme chat UI", I don't ask "do you want it dark?" — I just
build it. I only ask when there is a **real, meaningful fork** in the
implementation path where the two paths would lead to very different results.

---

## 19. `ask_permission`

### What it is
Requests explicit user authorization for an action that requires elevated or
sensitive permissions: file access outside the workspace, running certain
commands, accessing URLs, using MCP tools, or admin escalation.

### When I use it
- Reading or writing files **outside** the current workspace directory.
- Running commands that make network requests (`curl`, `wget`) — I invoke
  `run_command` directly so the user sees and approves the exact command.
- Accessing MCP tools that weren't pre-authorized.
- Needing root/sudo access (`escalate_admin`).
- When I realize mid-task that I need access to a broader directory than
  originally planned.

### Permission actions
| Action | Target format | When |
|---|---|---|
| `read_file` | Absolute path or directory | Read files outside workspace |
| `write_file` | Absolute path or directory | Write files outside workspace |
| `command` | Command prefix | Persistent approval for a command prefix |
| `execute_url` | Domain name | Programmatic access to a domain |
| `mcp` | `server/tool` or `server/*` | Use tools from an MCP server |
| `escalate_admin` | Reason string | sudo/root operations |
| `unsandboxed` | Command prefix | Commands that run outside terminal sandbox |

### Why it matters
Security. I should never silently touch files or systems outside what the user
expects. Asking first maintains trust and prevents accidents.

### If NOT
If I already have the permission (visible in `list_permissions`), I don't ask
again — I just proceed.

---

## 20. `list_permissions`

### What it is
Lists all currently active permission grants in this session: what paths,
commands, URLs, and MCP tools I'm already authorized to use.

### When I use it
- At the start of a session when I'm unsure what's already been granted.
- Before calling `ask_permission` — to check if I already have the access I
  need and avoid a redundant ask.
- When I get an unexpected permission error and want to diagnose what's missing.

### How I use it
```
list_permissions()
```

### Why it matters
Avoids annoying the user with repeated permission requests for things already
granted. Also helps me understand the security context I'm operating in.

### If NOT
If I just successfully read/wrote a file or ran a command, I obviously already
have that permission — no need to check.

---

## 21. Tool Decision Flow — Mental Model

When I receive a task, my internal decision tree looks roughly like this:

```
NEW TASK RECEIVED
│
├── Do I know the project structure?
│   ├── NO  → list_dir (root, then relevant subdirs)
│   └── YES → skip
│
├── Do I need to understand existing code?
│   ├── Know the file  → view_file (tight range if large)
│   ├── Know the symbol, not the file → grep_search → then view_file
│   └── Don't know either → list_dir + grep_search
│
├── Do I need external knowledge?
│   ├── Stable/known topic → answer from training
│   ├── Library API / version → read_url_content or search_web
│   └── Current events / bugs → search_web
│
├── What kind of change am I making?
│   ├── New file                     → write_to_file
│   ├── One contiguous region        → replace_file_content
│   ├── Multiple non-adjacent regions → multi_replace_file_content
│   └── Complete rewrite             → write_to_file (Overwrite=true)
│
├── After any code change:
│   └── run_command (build / typecheck / test) → command_status
│
├── Is the task complex enough to parallelize?
│   ├── YES → invoke_subagent (multiple parallel subagents)
│   └── NO  → handle myself
│
└── Is there genuine ambiguity?
    ├── YES → ask_question (multiple choice)
    └── NO  → proceed with best judgment
```

---

## Key Principles I Follow

1. **Read before write** — Always `view_file` before any edit.
2. **Surgical edits** — Prefer targeted replacements over full rewrites.
3. **Validate after change** — Always build/typecheck after code edits.
4. **Grep before browse** — Use `grep_search` to locate, then `view_file` to read.
5. **Parallelize when independent** — Concurrent subagents for independent subtasks.
6. **Ask only on real forks** — Don't ask trivial questions; make reasonable decisions.
7. **Permissions before access** — Never silently touch out-of-scope resources.
8. **No polling loops** — Use `schedule` + timers instead of busy-waiting.
9. **Fetch don't fabricate** — When unsure about an API or version, look it up.
10. **Minimal footprint** — Use the narrowest tool for the job, not the biggest one.

---

*Last updated: 2026-07-11 · Written by Antigravity (Claude Sonnet 4.6 Thinking)*
