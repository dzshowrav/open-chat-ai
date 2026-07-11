import { stateManager } from './state.js';
import { AgentRepository } from '../database/repositories/agentRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { SkillsManager } from '../skills/skillsManager.js';
import { ToolManager } from '../tools/toolManager.js';
import { execSync } from 'child_process';
import fs from 'fs';

export class ContextBuilder {
  private static agentRepo = new AgentRepository();
  private static sessionRepo = new SessionRepository();

  /**
   * Generates a comprehensive system prompt combining agent, tools catalog,
   * skills, git, and workspace metadata.
   */
  static buildSystemPrompt(): string {
    const state = stateManager.getState();

    // 1. Core developer baseline identity
    let prompt = `You are OpenChat CLI — a professional, fullscreen terminal-native AI coding agent.
You run directly in the user's terminal environment, optimized for Android Termux and standard Linux.
You are autonomous: you can read/write files, run shell commands, search the web, run TypeScript type checks, manage background processes, delegate to sub-agents, load skills, reason step-by-step, and more.

[Response Formatting Guidelines]
To make your responses highly readable, clean, and beautifully stylized in the terminal UI:
- Typography & Hierarchy:
  • Headings: Use a single H1 (exactly one '# Title') at the very top. Use '## Section' for major sections, and '### Sub-section' for subheadings. Always put a blank line before and after headings. Do NOT skip levels.
  • Paragraphs: Keep text paragraphs concise (2-4 lines). Break large blocks of explanation into logical bullet points.
- Highlighting & UI Elements:
  • Key Concepts: Use **bold** for key terms, file names, or crucial takeaways.
  • Inline Snippets: Use \`inline code\` for all commands, shell inputs, variable names, functions, and file paths (e.g., \`npm run build\`, \`package.json\`).
  • Keyboard Shortcuts: Use HTML keyboard tag format, e.g., <kbd>Ctrl</kbd> + <kbd>C</kbd> or <kbd>Esc</kbd>.
  • Highlights: Use HTML mark tag <mark>important text</mark> for highlighting critical warnings or highlights.
  • Underline & Small text: Use <u>underline</u> to emphasize headers in text, and <small>text</small> for minor details/footnotes.
- Lists & Progress Trackers:
  • Unordered lists: Use '-' for standard list items. Nest sub-lists with exactly 2 spaces.
  • Ordered lists: Use '1.' for steps, processes, or chronological instructions.
  • Task Trackers: Use checkbox syntax to report implementation plans or progress (e.g., '- [ ] Setup router', '- [x] Install express').
- Tables (Dynamic Layouts):
  • Use markdown tables to compare data, list configuration properties, show status flags, or summarize file structures.
  • Ensure column alignment syntax is specified correctly (e.g., |:---|:---:|---:|).
- Blockquotes & Callouts:
  • Use '>' for callouts, tips, cautions, or important notes (e.g., '> **Warning:** Make sure to backup before proceeding.').
- Code Blocks & File Diffs:
  • Code blocks: Always specify the language name for syntax highlighting (e.g. \`\`\`javascript, \`\`\`typescript, \`\`\`bash, \`\`\`json, \`\`\`css).
  • Diffs: When explaining specific edits in a file instead of full files, use the \`\`\`diff block syntax. Put '+' at the start of added lines, '-' for deleted lines, and '@@' for chunk headers.
- Emoji Shortcodes (Highly Recommended):
  • Instead of pasting unicode emojis, use standard emoji shortcodes to let our CLI rendering engine translate them into high-contrast colored icons:
    • ':check_mark:' or ':white_check_mark:' for completed items (rendered as ✅ or ✔)
    • ':x:' for errors, failures, or blockers (rendered as ❌)
    • ':warning:' for warnings, caveats, or checkups (rendered as ⚠️)
    • ':hourglass_flowing_sand:' or ':hourglass:' for processes in progress (rendered as ⏳)
    • ':rocket:' for launches, builds, deployments, or speed improvements (rendered as 🚀)
    • ':bulb:' for ideas, tips, or helpful shortcuts (rendered as 💡)
    • ':bug:' for issues or bug investigations (rendered as 🐛)
    • ':wrench:' for config changes or adjustments (rendered as 🔧)
    • ':tools:' or ':hammer_and_wrench:' for installations, scripting, or setup (rendered as 🛠️)
    • ':memo:' for notes, docs, or planning summaries (rendered as 📝)
    • ':dart:' or ':goal:' for goals, milestones, or objectives (rendered as 🎯)
    • ':package:' for releasing or bundling packages (rendered as 📦)
    • ':test_tube:' for test runs, assertions, or validations (rendered as 🧪)
- Collapsible details:
  • Wrap long diagnostic logs, shell outputs, or detailed stack traces in <details><summary>Click to expand</summary>...Content...</details> blocks to avoid cluttering the chat view.
`;

    // 2. Active Agent Persona
    const activeAgentId = state.activeAgentId;
    if (activeAgentId) {
      const agent = this.agentRepo.getAgent(activeAgentId);
      if (agent) {
        prompt += `\n[Active Agent Persona: ${agent.name}]\n${agent.prompt}\n`;
      }
    } else {
      const defaultAgent = this.agentRepo.getAgentByName('General');
      if (defaultAgent) {
        prompt += `\n[Agent Persona: General]\n${defaultAgent.prompt}\n`;
      }
    }

    // 3. Workspace metadata & project detection
    const workspacePath = state.workspacePath;
    if (workspacePath && fs.existsSync(workspacePath)) {
      prompt += `\n[Workspace: ${workspacePath}]\n`;
      try {
        const files = fs.readdirSync(workspacePath);
        const projectTypes: string[] = [];
        if (files.includes('package.json')) projectTypes.push('Node.js/npm');
        if (files.includes('composer.json')) projectTypes.push('PHP/Composer');
        if (files.includes('Cargo.toml') || files.includes('cargo.toml')) projectTypes.push('Rust/Cargo');
        if (files.includes('requirements.txt') || files.includes('pyproject.toml')) projectTypes.push('Python');
        if (files.includes('go.mod')) projectTypes.push('Go');
        if (files.includes('pom.xml') || files.includes('build.gradle')) projectTypes.push('Java');
        if (files.includes('mix.exs')) projectTypes.push('Elixir');
        if (files.includes('Gemfile')) projectTypes.push('Ruby');
        if (projectTypes.length > 0) {
          prompt += `Project Type(s): ${projectTypes.join(', ')}\n`;
        }

        // Detect git branch
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: workspacePath,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 3000
          }).trim();
          if (branch && branch !== 'HEAD') {
            prompt += `Git Branch: ${branch}\n`;
            stateManager.setState({ gitBranch: branch });
          }
        } catch {}

        // Check for tsconfig
        if (files.includes('tsconfig.json')) {
          prompt += `TypeScript: tsconfig.json detected — type_check tool available.\n`;
        }
      } catch {}
    }

    // 4. Tool Catalog — inject full list of available tools so AI knows its capabilities
    prompt += `\n[Available Native Tools]\n`;
    prompt += `You have access to the following built-in tools. Use them proactively:\n\n`;

    const toolCatalog = [
      // File Operations
      { name: 'read', cat: 'File', desc: 'Read files (with line-number pagination) or list directories. Supports offset+limit for large files.' },
      { name: 'write', cat: 'File', desc: 'Create or overwrite files. Creates parent directories automatically.' },
      { name: 'edit', cat: 'File', desc: 'String-based find-and-replace in files. Returns git-style diff. Use replaceAll for bulk renames.' },
      { name: 'grep', cat: 'File', desc: 'Regex content search across files. Returns file paths + line numbers + matching lines.' },
      { name: 'glob', cat: 'File', desc: 'Pattern-based file name search: *.ts, **/*.json, src/**/*.tsx.' },
      // Shell
      { name: 'bash', cat: 'Shell', desc: 'Execute shell commands. Always use non-interactive flags (-y, --yes). Chain with &&.' },
      { name: 'spawn_process', cat: 'Shell', desc: 'Start a long-running background process (dev server, REPL). Returns process_id.' },
      { name: 'read_process', cat: 'Shell', desc: 'Read stdout/stderr output from a background process.' },
      { name: 'write_process', cat: 'Shell', desc: 'Send stdin input to an interactive background process.' },
      { name: 'kill_process', cat: 'Shell', desc: 'Terminate a background process by ID.' },
      { name: 'list_processes', cat: 'Shell', desc: 'List all active background processes.' },
      { name: 'git_status', cat: 'Shell', desc: 'Show git working tree status.' },
      { name: 'git_diff', cat: 'Shell', desc: 'Show unstaged (or staged) git diffs.' },
      // Web
      { name: 'webfetch', cat: 'Web', desc: 'Fetch URL content as clean readable text. HTTP auto-upgraded to HTTPS.' },
      { name: 'websearch', cat: 'Web', desc: 'General web search via DuckDuckGo. Returns titles, URLs, snippets.' },
      { name: 'websearch_cited', cat: 'Web', desc: 'Grounded web search with numbered inline citations [1],[2]... and sources list.' },
      { name: 'fetch_url_content', cat: 'Web', desc: 'Fetch and strip HTML from a URL. Returns readable text.' },
      // TypeScript
      { name: 'type_check', cat: 'TypeScript', desc: 'Run tsc --noEmit to find type errors. Checks whole project or single file.' },
      { name: 'lookup_type', cat: 'TypeScript', desc: 'Find TypeScript type/interface/class definitions by name with file location.' },
      { name: 'list_types', cat: 'TypeScript', desc: 'List all TypeScript types, interfaces, classes, enums in the project.' },
      // Agent Coordination
      { name: 'delegate', cat: 'Agent', desc: 'Delegate work to a specialized background sub-agent (architect, debug, code-reviewer, etc.) asynchronously.' },
      { name: 'delegation_read', cat: 'Agent', desc: 'Read the result of a background delegation by ID.' },
      { name: 'delegation_list', cat: 'Agent', desc: 'List all active/completed delegations in this session.' },
      { name: 'task', cat: 'Agent', desc: 'Launch an autonomous AI agent for complex multi-step work. Resumable via task_id.' },
      // Skills
      { name: 'skill', cat: 'Skills', desc: 'Load a specialized skill\'s domain instructions before starting relevant work.' },
      { name: 'skill_find', cat: 'Skills', desc: 'Search available skills by natural language query.' },
      { name: 'skill_use', cat: 'Skills', desc: 'Load multiple skills simultaneously.' },
      { name: 'skill_resource', cat: 'Skills', desc: 'Read a resource file (template, config) from a skill directory.' },
      // Utilities
      { name: 'question', cat: 'Utility', desc: 'Ask the user an interactive question with optional multiple-choice options.' },
      { name: 'todowrite', cat: 'Utility', desc: 'Maintain a structured task list. Status: pending/in_progress/completed/cancelled.' },
      { name: 'sequential_thinking', cat: 'Utility', desc: 'Multi-step structured reasoning with revisions and branching. Use for complex decisions.' },
      { name: 'search_memory', cat: 'Utility', desc: 'Search across all past chat sessions for previous context and instructions.' },
      { name: 'list_tools', cat: 'Utility', desc: 'List all available tools with descriptions, filterable by category.' },
      { name: 'tool_logs', cat: 'Utility', desc: 'Query tool execution logs (status, duration, arguments) from the database.' },
      // MCP
      { name: 'list_mcp_resources', cat: 'MCP', desc: 'List resources exposed by connected MCP servers.' },
      { name: 'list_mcp_resource_templates', cat: 'MCP', desc: 'List parameterized URI templates from MCP servers.' },
      { name: 'read_mcp_resource', cat: 'MCP', desc: 'Read a specific resource from an MCP server by URI.' },
    ];

    // Group by category
    const byCategory = new Map<string, typeof toolCatalog>();
    for (const tool of toolCatalog) {
      if (!byCategory.has(tool.cat)) byCategory.set(tool.cat, []);
      byCategory.get(tool.cat)!.push(tool);
    }

    for (const [cat, tools] of byCategory) {
      prompt += `${cat}:\n`;
      for (const t of tools) {
        prompt += `  • ${t.name}: ${t.desc}\n`;
      }
      prompt += '\n';
    }

    prompt += `TOOL USAGE RULES:
- Always READ files before editing them
- Use grep/glob to find files instead of guessing paths
- Use sequential_thinking for non-trivial architectural decisions
- Use todowrite to track multi-step implementation progress
- Use type_check after editing TypeScript files
- Prefer parallel tool calls when operations are independent
- Use websearch for real-time information beyond knowledge cutoff
- Use delegate for parallel sub-tasks; use task for complex autonomous goals\n\n`;

    // 5. Automatic Persistent Memory from past sessions
    try {
      const allSessions = this.sessionRepo.listSessions();
      const recentSessions = allSessions
        .filter(s => s.id !== state.activeSessionId)
        .slice(0, 3);

      if (recentSessions.length > 0) {
        let memoryContext = '[Persistent Memory — Recent Sessions]\n';
        for (const sess of recentSessions) {
          const msgs = this.sessionRepo.getMessages(sess.id);
          const userMsgs = msgs.filter(m => m.role === 'user').slice(-2);
          const aiMsgs = msgs.filter(m => m.role === 'assistant' && m.content).slice(-1);
          if (userMsgs.length > 0) {
            memoryContext += `Session "${sess.title}":\n`;
            userMsgs.forEach(m => {
              memoryContext += `  User: ${(m.content || '').substring(0, 120).replace(/\n/g, ' ')}...\n`;
            });
            aiMsgs.forEach(m => {
              memoryContext += `  AI: ${(m.content || '').substring(0, 120).replace(/\n/g, ' ')}...\n`;
            });
          }
        }
        prompt += memoryContext;
        prompt += 'Use search_memory tool for deeper memory searches across all sessions.\n\n';
      }
    } catch {}

    // 6. Skills context
    try {
      const skills = SkillsManager.loadWorkspaceSkills();
      if (skills.length > 0) {
        const skillsPrompt = SkillsManager.buildSkillsPrompt(skills);
        prompt += skillsPrompt;
      }
    } catch {}

    return prompt;
  }

  /**
   * Get a summary of all registered tools for display in UI
   */
  static getToolsSummary(): Array<{ name: string; description: string; category: string }> {
    const schemas = ToolManager.getToolSchemas();
    const categoryMap: Record<string, string> = {
      read: 'file', read_file: 'file', write: 'file', write_file: 'file',
      edit: 'file', edit_file: 'file', list_directory: 'file', grep: 'file', glob: 'file',
      bash: 'shell', git_status: 'shell', git_diff: 'shell',
      spawn_process: 'shell', read_process: 'shell', write_process: 'shell',
      kill_process: 'shell', list_processes: 'shell',
      fetch_url_content: 'web', search_web: 'web', webfetch: 'web',
      websearch: 'web', websearch_cited: 'web',
      type_check: 'typescript', lookup_type: 'typescript', list_types: 'typescript',
      delegate: 'agent', delegation_read: 'agent', delegation_list: 'agent', task: 'agent',
      skill: 'skill', skill_find: 'skill', skill_use: 'skill', skill_resource: 'skill',
      question: 'utility', todowrite: 'utility', sequential_thinking: 'utility',
      search_memory: 'utility', list_tools: 'utility', tool_logs: 'utility',
      list_mcp_resources: 'mcp', list_mcp_resource_templates: 'mcp', read_mcp_resource: 'mcp'
    };

    return schemas.map(s => ({
      name: s.function.name,
      description: s.function.description || '',
      category: categoryMap[s.function.name] || 'other'
    }));
  }
}
