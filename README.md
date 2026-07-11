# OpenChat AI

![Node Version](https://img.shields.io/badge/node-%3E%3D%2018-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![React Ink](https://img.shields.io/badge/React-Ink-green.svg)
![Platform Support](https://img.shields.io/badge/platform-Termux%20%7C%20Linux-orange.svg)

OpenChat AI is an advanced, terminal-based AI coding assistant engineered specifically for Termux and Linux environments. It brings the power of state-of-the-art coding agents directly into your terminal workspace with a highly optimized, keyboard-driven UI built on React Ink.

---

## Key Features

### 1. Global CLI Activation
* Run `oc` in any project folder to immediately initialize a workspace.
* Uses a global, persistent SQLite database located at `~/.openchat/openchat.db` to share settings, provider configurations, history, and permissions across all projects.

### 2. Interactive Dialogs & Controls
* **Double-ESC Force Abort:** Press `ESC` twice within 1 second to instantly abort active network streams, cancel LLM queries, and close open dialog overlays.
* **Selectable Multiple-Choice Prompts:** Fully interactive prompt selector for security decisions and AI-driven questions. Use Up/Down Arrow keys and press Enter to select choices directly.

### 3. Dynamic Execution & Thinking States
* Context-specific status indicator replaces standard static loading text.
* Displays dynamic words based on active tool behavior: `Reading...`, `Writing...`, `Searching...`, `Building...`, `Debugging...`, etc.
* Custom, unseen actions are grammatically parsed to present-continuous form (e.g. `Delegating...`) and permanently cached in SQLite for future reuse.
* Integrated real-time elapsed timer.

### 4. 100% Emoji-Free Nerd Font Integration
* Completely free of colored emojis to guarantee high-performance rendering on mobile terminals.
* Uses clean, high-resolution Nerd Font Unicode glyphs (`\u{F0F6}`, `\u{F120}`, `\u{F0AC}`, etc.) for file indicators, status flags, and category tabs.

### 5. Extended Skill & MCP Fallbacks
* If a requested skill file or MCP server is not found locally, the system automatically runs an internet search to find and recommend matching public GitHub repositories and reference files.

---

## Installation

Install globally using `npm` directly from the local repository directory or via GitHub:

```bash
# Clone the repository
git clone https://github.com/dzshowrav/open-chat-ai.git
cd open-chat-ai

# Install dependencies
npm install

# Build and link globally
npm run build
npm link
```

Once linked, the global `oc` binary is registered. You can run it anywhere:

```bash
oc
```

---

## Command Reference

Activate the command palette inside the application by typing `/`:

| Command | Action |
| --- | --- |
| `/history` | Open past chat sessions switcher |
| `/tools` | View Native Tool Registry and active capabilities |
| `/permissions` | Manage tool execution security permissions |
| `/providers` | Register, edit, or configure API providers |
| `/models` | Register models associated with configured providers |
| `/settings` | Update global assistant preferences |
| `/skills` | Scan and load custom developer skillpacks |
| `/mcp` | Configure and list connected MCP servers |

---

## File System & Skillpacks

Customize OpenChat AI's expertise by placing `SKILL.md` markdown packs in any of the following scanned directories:

* `~/.config/openchat/skills/<skill-name>/SKILL.md`
* `~/.claude/skills/<skill-name>/SKILL.md`
* `.openchat/skills/<skill-name>/SKILL.md` (Workspace root)
* `.skills/<skill-name>/SKILL.md`
* `skills/<skill-name>/SKILL.md`

---

## Security

OpenChat AI implements a granular permission model. You can configure tools to run under:
* **Always Allow:** Run without prompting.
* **Allow Once:** Allow execution for the current turn.
* **Ask:** Prompt with an interactive multiple-choice selector.
* **Deny:** Prevent tool execution.

---

## Troubleshooting, Reset & Uninstallation

If you want to reset the application back to its fresh default state (wiping all saved providers, API keys, AI models, and chat history):

```bash
# Reset the database to a fresh state
oc --clean

# Or via npm scripts in the repository folder:
npm run clean:db
```

### Complete Uninstallation

To completely uninstall OpenChat AI from your system (including deleting the global SQLite database, logs, settings directories, and removing the global `oc` CLI tool link):

```bash
# Uninstall via the global CLI directly
oc --uninstall

# Or via npm scripts in the repository folder:
npm run uninstall
```
