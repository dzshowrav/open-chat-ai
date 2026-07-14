import { ToolManager } from '../toolManager.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const asyncExec = promisify(exec);
import { stateManager } from '../../core/state.js';
import { SkillsManager } from '../../skills/skillsManager.js';
import { McpManager } from '../../mcp/mcpManager.js';
import { eventBus } from '../../core/events.js';
import { initDatabase } from '../../database/connection.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// ─────────────────────────────────────────────────────────────
// In-memory stores for delegations, todos, and thinking chains
// ─────────────────────────────────────────────────────────────
const delegationStore = new Map<string, {
  agent: string;
  prompt: string;
  status: 'running' | 'completed' | 'failed';
  result: string;
  startedAt: number;
  taskId: string;
}>();

const todoStore: Array<{
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
}> = [];

const thinkingChains = new Map<string, Array<{
  index: number;
  text: string;
  isBranch?: boolean;
  branchFrom?: number;
  isRevision?: boolean;
}>>();

// ─────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────
function getWsPath(): string {
  return stateManager.getState().workspacePath || process.cwd();
}

function fetchUrl(url: string, timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timeout')), timeout);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenChat-CLI/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(timer);
        fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { clearTimeout(timer); resolve(data); });
    }).on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function htmlToText(html: string, maxLen = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function parseDDGResults(html: string, limit = 5): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Parse result blocks - DuckDuckGo HTML structure
  const blockRegex = /<div class="result[^"]*"[\s\S]*?(?=<div class="result[^"]*"|$)/g;
  let block: RegExpExecArray | null;

  while ((block = blockRegex.exec(html)) !== null && results.length < limit) {
    const blockHtml = block[0];

    // Extract title and URL
    const titleMatch = blockHtml.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const rawUrl = titleMatch[1];
    const rawTitle = htmlToText(titleMatch[2], 200);

    // Resolve DuckDuckGo redirect URLs
    let url = rawUrl;
    if (rawUrl.includes('duckduckgo.com/l/?') || rawUrl.startsWith('/l/?')) {
      const uddMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uddMatch) {
        url = decodeURIComponent(uddMatch[1]);
      }
    }
    if (!url.startsWith('http')) continue;

    // Extract snippet
    const snippetMatch = blockHtml.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? htmlToText(snippetMatch[1], 300) : '';

    results.push({ title: rawTitle.trim(), url, snippet });
  }

  return results;
}

export function registerExtendedTools(): void {

  // ─────────────────────────────────────────────────────────────
  // 📝 FILE OPERATIONS (Extended)
  // ─────────────────────────────────────────────────────────────

  // grep — Regex content search across files
  ToolManager.registerTool({
    name: 'grep',
    description: [
      'Regex content search across files in the workspace.',
      'Returns matching file paths with line numbers and matching lines.',
      'Filter by file type with include parameter (e.g., "*.ts", "*.json").',
      'Use case_insensitive=true for case-insensitive matching.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for.' },
        include: { type: 'string', description: 'File glob filter e.g. "*.ts", "*.json", "*.tsx"' },
        path: { type: 'string', description: 'Subdirectory to search in (defaults to workspace root)' },
        case_insensitive: { type: 'boolean', description: 'Enable case-insensitive matching (-i flag).' },
        max_results: { type: 'number', description: 'Maximum number of match lines to return. Default: 50.' }
      },
      required: ['pattern']
    }
  }, async (args) => {
    const wsPath = getWsPath();
    const searchPath = args.path ? path.resolve(wsPath, args.path) : wsPath;
    try {
      const includeFlag = args.include ? `--include="${args.include}"` : '';
      const caseFlag = args.case_insensitive ? '-i' : '';
      // Escape pattern for shell
      const escapedPattern = args.pattern.replace(/'/g, "'\\''");
      const cmd = `grep -rnE ${caseFlag} '${escapedPattern}' ${includeFlag} . 2>/dev/null || true`;
      const { stdout: rawResult } = await asyncExec(cmd, { cwd: searchPath, timeout: 15000 });
      const lines = rawResult.trim().split('\n').filter(Boolean);
      const maxResults = args.max_results || 50;
      const truncated = lines.length > maxResults;
      const displayed = lines.slice(0, maxResults);
      if (!displayed.length) return `No matches found for pattern: "${args.pattern}"`;
      let output = `Found ${lines.length} match(es) for "${args.pattern}"${truncated ? ` (showing first ${maxResults})` : ''}:\n\n`;
      output += displayed.join('\n');
      if (truncated) output += `\n\n... ${lines.length - maxResults} more matches. Use a more specific pattern or increase max_results.`;
      return output;
    } catch (e: any) {
      return `Grep search failed: ${e.message}`;
    }
  });

  // glob — Pattern-based file name search
  ToolManager.registerTool({
    name: 'glob',
    description: [
      'Pattern-based file name search. Supports wildcards: *.ts, **/*.json, src/**/*.tsx.',
      'Excludes node_modules, .git, dist by default.',
      'Returns full paths of matching files.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern e.g. "*.ts", "**/*.json", "src/**/*.tsx"' },
        cwd: { type: 'string', description: 'Optional: directory to search in (relative to workspace). Defaults to workspace.' },
        exclude_dirs: { type: 'array', items: { type: 'string' }, description: 'Additional directories to exclude.' }
      },
      required: ['pattern']
    }
  }, async (args) => {
    const wsPath = args.cwd ? path.resolve(getWsPath(), args.cwd) : getWsPath();
    try {
      const excludeDefaults = ['node_modules', '.git', 'dist', '.next', 'build', '__pycache__', '.cache'];
      const extraExcludes = args.exclude_dirs || [];
      const allExcludes = [...excludeDefaults, ...extraExcludes];
      const excludeFlags = allExcludes.map(d => `-not -path "*/${d}/*"`).join(' ');

      // Handle ** patterns by using find with -name for simple patterns
      let findArgs = '';
      if (args.pattern.includes('/')) {
        // Multi-segment pattern — use path-based matching
        const cleanPattern = args.pattern.replace(/\*\*\//g, '');
        findArgs = `-name "${cleanPattern}"`;
      } else {
        findArgs = `-name "${args.pattern}"`;
      }

      const cmd = `find . ${findArgs} ${excludeFlags} -type f 2>/dev/null`;
      const { stdout: resultRaw } = await asyncExec(cmd, { cwd: wsPath, timeout: 10000 });
      const result = resultRaw.trim();
      if (!result) return `No files matched pattern: "${args.pattern}" in ${wsPath}`;
      const files = result.split('\n').filter(Boolean);
      return `Found ${files.length} file(s) matching "${args.pattern}":\n${files.join('\n')}`;
    } catch (e: any) {
      return `Glob search failed: ${e.message}`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 🌐 WEB TOOLS
  // ─────────────────────────────────────────────────────────────

  // webfetch — Fetch URL content in text/markdown
  ToolManager.registerTool({
    name: 'webfetch',
    description: [
      'Fetch content from a URL. Returns text/markdown content of the page.',
      'Automatically upgrades HTTP to HTTPS.',
      'Strips scripts/styles/nav for clean LLM-consumable text.',
      'Supports format: "text" (default) or "html" (raw HTML).'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch.' },
        format: { type: 'string', description: '"text" (default, clean readable) or "html" (raw HTML)' },
        max_length: { type: 'number', description: 'Max characters to return. Default: 8000.' }
      },
      required: ['url']
    }
  }, async (args) => {
    try {
      let url = args.url;
      if (!url.startsWith('https://') && !url.startsWith('http://')) url = 'https://' + url;
      if (url.startsWith('http://')) url = url.replace('http://', 'https://');
      const raw = await fetchUrl(url);
      const maxLen = args.max_length || 8000;
      if (args.format === 'html') return raw.slice(0, maxLen);
      const text = htmlToText(raw, maxLen);
      return `Content from ${url}:\n\n${text}`;
    } catch (e: any) {
      return `Failed to fetch URL (${args.url}): ${e.message}`;
    }
  });

  // websearch — General web search with reliable parsing
  ToolManager.registerTool({
    name: 'websearch',
    description: [
      'General web search using DuckDuckGo. Returns top search results with titles, URLs, and descriptions.',
      'Use specific queries for best results. Include year for recent info.',
      'For results with citations/sources, use websearch_cited instead.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        num_results: { type: 'number', description: 'Number of results to return (1-10). Default: 5.' }
      },
      required: ['query']
    }
  }, async (args) => {
    try {
      const q = encodeURIComponent(args.query);
      const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}&kl=us-en`);
      const limit = Math.min(args.num_results || 5, 10);
      const results = parseDDGResults(html, limit);

      if (!results.length) {
        // Fallback: try without region
        const html2 = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}`);
        const results2 = parseDDGResults(html2, limit);
        if (!results2.length) return `Web search returned no results for: "${args.query}". Try a different query.`;
        return formatSearchResults(args.query, results2);
      }

      return formatSearchResults(args.query, results);
    } catch (e: any) {
      return `Web search failed: ${e.message}`;
    }
  });

  function formatSearchResults(query: string, results: Array<{ title: string; url: string; snippet: string }>): string {
    const formatted = results.map((r, i) =>
      `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`
    );
    return `Web Search Results for "${query}":\n\n${formatted.join('\n\n')}`;
  }

  // websearch_cited — Grounded web search with inline citations
  ToolManager.registerTool({
    name: 'websearch_cited',
    description: [
      'Grounded web search with inline citations.',
      'Returns a digest with numbered citations [1],[2],... and a Sources list of URLs.',
      'Ideal when the user needs verifiable, sourced information.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' }
      },
      required: ['query']
    }
  }, async (args) => {
    try {
      const q = encodeURIComponent(args.query);
      const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}&kl=us-en`);
      const results = parseDDGResults(html, 5);

      if (!results.length) return `No cited results found for: "${args.query}"`;

      // Build digest with inline citation numbers
      const snippetLines = results.map((r, i) => `[${i + 1}] ${r.snippet || r.title}`);
      const sources = results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.url}`);

      return [
        `**Summary for "${args.query}":**`,
        '',
        snippetLines.join('\n'),
        '',
        '**Sources:**',
        sources.join('\n')
      ].join('\n');
    } catch (e: any) {
      return `Cited search failed: ${e.message}`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 🧠 TYPESCRIPT TOOLS
  // ─────────────────────────────────────────────────────────────

  // type_check — Run TypeScript type checking
  ToolManager.registerTool({
    name: 'type_check',
    description: [
      'Run TypeScript type checking on the project using tsconfig.json.',
      'Returns all type errors found. Use after writing/editing TypeScript files.',
      'Optionally check a specific file only for faster targeted checking.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Optional: check a specific file only (faster). Defaults to entire project.' }
      }
    }
  }, async (args) => {
    try {
      const wsPath = getWsPath();
      // Try local tsc first, fall back to global
      let tscPath = path.join(wsPath, 'node_modules', '.bin', 'tsc');
      if (!fs.existsSync(tscPath)) {
        tscPath = path.join(wsPath, 'node_modules', 'typescript', 'bin', 'tsc');
      }
      if (!fs.existsSync(tscPath)) tscPath = 'npx tsc';

      const fileArg = args.file ? `"${args.file}"` : '';
      const cmd = `${tscPath} --noEmit ${fileArg} 2>&1 || true`;
      const { stdout: result } = await asyncExec(cmd, { cwd: wsPath, timeout: 60000 });
      const output = result.trim();
      if (!output || output === '') return `✔ No TypeScript type errors found${args.file ? ` in ${args.file}` : ' in project'}.`;
      const lines = output.split('\n');
      const errorCount = lines.filter(l => /error TS\d+/.test(l)).length;
      return `Found ${errorCount} TypeScript error(s):\n\n${output.slice(0, 6000)}`;
    } catch (err: any) {
      return err.stdout?.slice(0, 4000) || `Type check failed: ${err.message}`;
    }
  });

  // lookup_type — Look up TypeScript type definitions
  ToolManager.registerTool({
    name: 'lookup_type',
    description: [
      'Look up TypeScript type/interface/class/function/enum definitions by name.',
      'Returns full type signature, file location, and line number.',
      'Use exact=false for partial name matching (slower but finds more).',
      'Use includeUsages=true to also find all import/usage locations.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        typeName: { type: 'string', description: 'Name of the type/interface/class/function to look up.' },
        exact: { type: 'boolean', description: 'Exact match only. Default: false (contains matching).' },
        kind: { type: 'string', description: 'Filter by kind: interface, type, class, function, enum, const' },
        includeUsages: { type: 'boolean', description: 'Also show where this type is imported/used. Default: false.' }
      },
      required: ['typeName']
    }
  }, async (args) => {
    try {
      const wsPath = getWsPath();
      const kindFilter = args.kind
        ? args.kind
        : 'interface|type|class|enum|function|const';
      const nameMatch = args.exact
        ? `\\b${args.typeName}\\b`
        : args.typeName;
      const pattern = `(export )?(${kindFilter})\\s+${nameMatch}`;

      let resultRaw = (await asyncExec(
        `grep -rnE '${pattern}' src/ 2>/dev/null || true`,
        { cwd: wsPath, timeout: 10000 }
      )).stdout.slice(0, 3000);

      if (!resultRaw.trim()) {
        resultRaw = (await asyncExec(
          `grep -rnE '${pattern}' . --include='*.ts' --include='*.tsx' 2>/dev/null || true`,
          { cwd: wsPath, timeout: 10000 }
        )).stdout.slice(0, 3000);
      }

      if (!resultRaw.trim()) return `Type "${args.typeName}" not found. Try exact=false or check the type name spelling.`;

      let output = `Type definitions matching "${args.typeName}":\n\n${resultRaw}`;

      if (args.includeUsages) {
        const { stdout: usageRaw } = await asyncExec(
          `grep -rnE '\\b${args.typeName}\\b' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v '${pattern}' || true`,
          { cwd: wsPath, timeout: 10000 }
        );
        const usageResult = usageRaw.slice(0, 2000);
        if (usageResult.trim()) {
          output += `\n\nUsages/imports of "${args.typeName}":\n${usageResult}`;
        }
      }

      return output;
    } catch (e: any) {
      return `lookup_type failed: ${e.message}`;
    }
  });

  // list_types — List all TypeScript type names in project
  ToolManager.registerTool({
    name: 'list_types',
    description: [
      'List all TypeScript types, interfaces, classes, enums, functions in the project.',
      'Filter by kind to narrow results. Use limit to cap the output.',
      'Ideal for exploring an unfamiliar codebase.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'Filter: interface, type, class, function, enum, const (comma-separated for multiple).' },
        limit: { type: 'number', description: 'Max results. Default: 50.' },
        path: { type: 'string', description: 'Subdirectory to search in. Defaults to src/.' }
      }
    }
  }, async (args) => {
    try {
      const wsPath = getWsPath();
      const searchDir = args.path || 'src/';
      const kindFilter = args.kind
        ? args.kind.split(',').map((k: string) => k.trim()).join('|')
        : 'interface|type|class|enum|function|const';
      const { stdout: result } = await asyncExec(
        `grep -rhE '^(export )?(${kindFilter}) [A-Za-z]' ${searchDir} --include='*.ts' --include='*.tsx' 2>/dev/null || true`,
        { cwd: wsPath, timeout: 15000 }
      );
      const lines = result.trim().split('\n').filter(Boolean);
      const limit = args.limit || 50;
      const truncated = lines.length > limit;
      const displayed = lines.slice(0, limit);
      if (!displayed.length) return `No type definitions found in ${searchDir}.`;
      let output = `Found ${lines.length} type definition(s)${truncated ? ` (showing first ${limit})` : ''}:\n\n${displayed.join('\n')}`;
      if (truncated) output += `\n\n... and ${lines.length - limit} more. Use kind filter or increase limit.`;
      return output;
    } catch (e: any) {
      return `list_types failed: ${e.message}`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 🤖 AGENT COORDINATION
  // ─────────────────────────────────────────────────────────────

  // delegate — Delegate work to background subagents
  ToolManager.registerTool({
    name: 'delegate',
    description: [
      'Delegate work to a specialized background subagent. Returns immediately with a delegation ID.',
      'The subagent runs a parallel AI completion with a role-specific system prompt.',
      'Available agents: architect, backend-dev, code-reviewer, database-optimizer,',
      'debug, devops-engineer, explore, frontend-ui, general, performance-optimizer,',
      'security-auditor, tdd-dev.',
      'Use delegation_read(id) to get results. Use delegation_list() to see all active delegations.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Subagent type: architect|backend-dev|code-reviewer|database-optimizer|debug|devops-engineer|explore|frontend-ui|general|performance-optimizer|security-auditor|tdd-dev'
        },
        prompt: { type: 'string', description: 'Detailed task prompt with full context and expected output format.' }
      },
      required: ['agent', 'prompt']
    }
  }, async (args) => {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    delegationStore.set(id, {
      agent: args.agent,
      prompt: args.prompt,
      status: 'running',
      result: '',
      startedAt: Date.now(),
      taskId: id
    });

    // Emit event for UI to show delegation is running
    eventBus.emit('tool:started', { toolName: `delegate[${args.agent}]`, args });

    // Run delegation using stored AI credentials from state
    setImmediate(async () => {
      const entry = delegationStore.get(id);
      if (!entry) return;

      try {
        const { ApiEngine } = await import('../../api/apiEngine.js');
        const { ProviderRepository } = await import('../../database/repositories/providerRepository.js');

        const providerRepo = new ProviderRepository();
        const st = stateManager.getState();

        const provider = st.activeProviderId ? providerRepo.getProvider(st.activeProviderId) : null;
        const model = st.activeModelId || null;

        if (!provider || !model) {
          entry.status = 'completed';
          entry.result = `[Delegation: ${args.agent}] No active provider/model configured. The task was received but cannot be executed autonomously without an AI connection. Please configure a provider first.\n\nTask summary: ${args.prompt.slice(0, 200)}`;
          return;
        }

        const agentSystemPrompts: Record<string, string> = {
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

        const systemPrompt = agentSystemPrompts[args.agent] || agentSystemPrompts['general'];

        const response = await ApiEngine.chatCompletion({
          provider,
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.prompt }
          ] as any,
          stream: false
        });

        entry.status = 'completed';
        entry.result = response.content || '[Agent completed with no textual response]';
      } catch (err: any) {
        const entry = delegationStore.get(id);
        if (entry) {
          entry.status = 'failed';
          entry.result = `Delegation failed: ${err.message}\n\nTask: ${args.prompt.slice(0, 300)}`;
        }
      }
    });

    return [
      `Delegation started successfully.`,
      `ID: ${id}`,
      `Agent: ${args.agent}`,
      ``,
      `Run delegation_read("${id}") to get the result when complete.`,
      `Typically completes in 5-30 seconds depending on complexity.`
    ].join('\n');
  });

  // delegation_read — Read delegation result
  ToolManager.registerTool({
    name: 'delegation_read',
    description: 'Read the full result of a background delegation by ID. Returns status (running/completed/failed) and result.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The delegation ID returned by the delegate tool.' }
      },
      required: ['id']
    }
  }, async (args) => {
    const entry = delegationStore.get(args.id);
    if (!entry) return `No delegation found with ID: "${args.id}". Use delegation_list() to see all delegations.`;
    const elapsed = Math.round((Date.now() - entry.startedAt) / 1000);
    if (entry.status === 'running') {
      return `Delegation ${args.id} [${entry.agent}] is still running... (${elapsed}s elapsed)\n\nTask: ${entry.prompt.slice(0, 100)}...`;
    }
    return [
      `Delegation ${args.id} [${entry.agent}]`,
      `Status: ${entry.status === 'completed' ? '✔ Completed' : '✖ Failed'}`,
      `Elapsed: ${elapsed}s`,
      ``,
      `Result:`,
      entry.result
    ].join('\n');
  });

  // delegation_list — List all active delegations
  ToolManager.registerTool({
    name: 'delegation_list',
    description: 'List all active and completed background delegations for this session, with their status and prompt previews.',
    parameters: { type: 'object', properties: {} }
  }, async () => {
    if (delegationStore.size === 0) return 'No active delegations in this session.';
    const list = Array.from(delegationStore.entries()).map(([id, d]) => {
      const elapsed = Math.round((Date.now() - d.startedAt) / 1000);
      const statusIcon = d.status === 'completed' ? '✔' : d.status === 'failed' ? '✖' : '⠿';
      return `${statusIcon} [${id}] ${d.agent} | ${d.status} | ${elapsed}s\n  Prompt: "${d.prompt.slice(0, 80)}"`;
    });
    return `Delegations (${delegationStore.size}):\n\n${list.join('\n\n')}`;
  });

  // task — Launch autonomous agent for complex multi-step work
  ToolManager.registerTool({
    name: 'task',
    description: [
      'Launch an autonomous AI agent for complex, multi-step tasks.',
      'Unlike delegate (one-shot), task agents are meant for larger goals.',
      'Provide a highly detailed goal with all context needed.',
      'Use task_id to resume a previous task session.',
      'Agents: architect, backend-dev, code-reviewer, debug, devops-engineer,',
      'explore, frontend-ui, general, performance-optimizer, security-auditor, tdd-dev.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent type to launch. Default: general.' },
        goal: { type: 'string', description: 'Detailed goal with full context and expected deliverables.' },
        task_id: { type: 'string', description: 'Optional: resume a previous task by ID.' }
      },
      required: ['goal']
    }
  }, async (args) => {
    const agentType = args.agent || 'general';
    const id = args.task_id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    delegationStore.set(id, {
      agent: agentType,
      prompt: args.goal,
      status: 'running',
      result: '',
      startedAt: Date.now(),
      taskId: id
    });

    eventBus.emit('tool:started', { toolName: `task[${agentType}]`, args });

    setImmediate(async () => {
      const entry = delegationStore.get(id);
      if (!entry) return;
      try {
        const { ApiEngine } = await import('../../api/apiEngine.js');
        const { ProviderRepository } = await import('../../database/repositories/providerRepository.js');

        const providerRepo = new ProviderRepository();
        const st = stateManager.getState();
        const provider = st.activeProviderId ? providerRepo.getProvider(st.activeProviderId) : null;
        const model = st.activeModelId || null;

        if (!provider || !model) {
          entry.status = 'completed';
          entry.result = `Task agent ${agentType} received goal but cannot execute without an active AI provider.\n\nGoal: ${args.goal.slice(0, 300)}`;
          return;
        }

        // Task agents get a richer, multi-step system prompt
        const systemPrompt = `You are an autonomous AI agent operating as a "${agentType}" specialist.
Your job is to fully complete the following goal through step-by-step reasoning and execution.

Guidelines:
- Break the goal into clear, ordered steps
- For each step, explain your reasoning
- Provide concrete, actionable results
- If writing code, include complete, working implementations
- Summarize what was accomplished at the end

Be thorough. The user is relying on you to complete this autonomously.`;

        const response = await ApiEngine.chatCompletion({
          provider,
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Goal: ${args.goal}` }
          ] as any,
          stream: false
        });

        entry.status = 'completed';
        entry.result = response.content || '[Task agent completed with no textual response]';
      } catch (err: any) {
        const entry = delegationStore.get(id);
        if (entry) {
          entry.status = 'failed';
          entry.result = `Task agent failed: ${err.message}`;
        }
      }
    });

    return [
      `Autonomous task agent launched.`,
      `Task ID: ${id}`,
      `Agent: ${agentType}`,
      `Goal: "${args.goal.slice(0, 120)}"`,
      ``,
      `Run delegation_read("${id}") to get results.`,
      `This may take 10-60 seconds for complex tasks.`
    ].join('\n');
  });

  // ─────────────────────────────────────────────────────────────
  // 📚 SKILLS
  // ─────────────────────────────────────────────────────────────

  // skill — Load a specialized skill
  ToolManager.registerTool({
    name: 'skill',
    description: [
      'Load a specialized skill\'s instructions into the conversation.',
      'Skills provide domain-specific workflows, best practices, and guidance.',
      'Load skills BEFORE starting domain-specific work for best results.',
      'Skill locations: ~/.config/openchat/skills/, ~/.claude/skills/, .skills/ in workspace.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        skillName: { type: 'string', description: 'Name of the skill to load (e.g., "react-expert", "typescript-pro").' }
      },
      required: ['skillName']
    }
  }, async (args) => {
    try {
      // First try workspace skills DB
      const dbSkills = SkillsManager.loadWorkspaceSkills();
      const dbMatch = dbSkills.find((s: any) =>
        s.name?.toLowerCase() === args.skillName.toLowerCase() ||
        s.id?.toLowerCase() === args.skillName.toLowerCase()
      );
      if (dbMatch) {
        const instructions = (dbMatch as any).instructions || '';
        return [
          `Skill "${args.skillName}" loaded successfully from workspace database.`,
          ``,
          `Description: ${(dbMatch as any).description || 'Domain-specific skill'}`,
          `Category: ${(dbMatch as any).category || 'general'}`,
          ``,
          `Instructions:`,
          instructions.slice(0, 3000) || '(No instructions text found)'
        ].join('\n');
      }

      const skillDirs = [
        path.join(process.env.HOME || '', '.config', 'openchat', 'skills', args.skillName),
        path.join(process.env.HOME || '', '.claude', 'skills', args.skillName),
        path.join(process.env.HOME || '', '.skills', args.skillName),
        path.join(getWsPath(), '.openchat', 'skills', args.skillName),
        path.join(getWsPath(), '.skills', args.skillName),
        path.join(getWsPath(), 'skills', args.skillName)
      ];

      for (const dir of skillDirs) {
        const skillFile = path.join(dir, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf8');
          return [
            `Skill "${args.skillName}" loaded from ${skillFile}`,
            ``,
            content.slice(0, 4000)
          ].join('\n');
        }
      }

      try {
        const q = encodeURIComponent(`"${args.skillName}" ai coding skill markdown file github`);
        const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}`);
        const webResults = parseDDGResults(html);
        if (webResults.length > 0) {
          const formatted = webResults.map((r: any, _idx: number) => `• ${r.title}\n  Link: ${r.url}\n  Description: ${r.snippet}`).join('\n');
          return [
            `Skill "${args.skillName}" was not found locally.`,
            `Searching the internet fallback results found:`,
            formatted,
            ``,
            `You can download/copy these references into: .openchat/skills/${args.skillName}/SKILL.md`
          ].join('\n');
        }
      } catch (e) { console.error('[extendedTools] Skill search failed:', e); }

      const availableList = 'react-expert, typescript-pro, architect, debugging-wizard, security-and-hardening, performance-optimization, test-driven-development, code-reviewer';
      return [
        `Skill "${args.skillName}" not found in any known skill directory.`,
        ``,
        `Common built-in skills: ${availableList}`,
        ``,
        `To create a skill, make a directory at .openchat/skills/${args.skillName}/SKILL.md`,
        `Use skill_find to search available skills.`
      ].join('\n');
    } catch (e: any) {
      return `Error loading skill: ${e.message}`;
    }
  });

  // skill_find — Search available skills
  ToolManager.registerTool({
    name: 'skill_find',
    description: 'Search available skills using natural language queries. Returns matching skill names and descriptions.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search e.g. "react testing", "security hardening", "typescript".' }
      },
      required: ['query']
    }
  }, async (args) => {
    try {
      const q = args.query.toLowerCase();
      const dbSkills = SkillsManager.loadWorkspaceSkills();
      const dbMatches = dbSkills.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        (s as any).description?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        (s as any).category?.toLowerCase().includes(q)
      );

      const skillDirs = [
        path.join(process.env.HOME || '', '.config', 'openchat', 'skills'),
        path.join(process.env.HOME || '', '.claude', 'skills'),
        path.join(getWsPath(), '.openchat', 'skills'),
        path.join(getWsPath(), '.skills'),
        path.join(getWsPath(), 'skills')
      ];

      const fsSkills: string[] = [];
      for (const dir of skillDirs) {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(name => {
            if (fs.statSync(path.join(dir, name)).isDirectory()) {
              if (name.toLowerCase().includes(q) || q === '') {
                fsSkills.push(`${name} (at ${dir})`);
              }
            }
          });
        }
      }

      const allResults = [
        ...dbMatches.map((s: any) => `${s.name || s.id} (workspace DB${(s as any).description ? ': ' + (s as any).description : ''})`),
        ...fsSkills
      ];

      if (!allResults.length) {
        try {
          const q = encodeURIComponent(`${args.query} ai coding skill markdown file github`);
          const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}`);
          const webResults = parseDDGResults(html);
          if (webResults.length > 0) {
            const formatted = webResults.map((r: any, _idx: number) => `• ${r.title}\n  Link: ${r.url}\n  Description: ${r.snippet}`).join('\n');
            return [
              `No local skills matched "${args.query}".`,
              `Searching the internet fallback results found:`,
              formatted,
              ``,
              `You can download/copy these references into: .openchat/skills/<skill-name>/SKILL.md`
            ].join('\n');
          }
        } catch (e) { console.error('[extendedTools] Skill search web fallback failed:', e); }

        return [
          `No skills found matching "${args.query}".`,
          ``,
          `Built-in skill names: react-expert, typescript-pro, architect, debugging-wizard,`,
          `security-and-hardening, performance-optimization, test-driven-development, code-reviewer`,
          ``,
          `Create custom skills at: .openchat/skills/<skill-name>/SKILL.md`
        ].join('\n');
      }

      return `Skills matching "${args.query}" (${allResults.length}):\n${allResults.map(s => `• ${s}`).join('\n')}`;
    } catch {
      return `Available built-in skills: react-expert, typescript-pro, architect, debugging-wizard, security-and-hardening, performance-optimization, test-driven-development, code-reviewer.`;
    }
  });

  // skill_use — Load multiple skills at once
  ToolManager.registerTool({
    name: 'skill_use',
    description: 'Load multiple skills at once into the conversation. More efficient than calling skill() multiple times.',
    parameters: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of skill names to load simultaneously.'
        }
      },
      required: ['skills']
    }
  }, async (args) => {
    const results: string[] = [];
    for (const skillName of args.skills) {
      const skillDirs = [
        path.join(process.env.HOME || '', '.config', 'openchat', 'skills', skillName, 'SKILL.md'),
        path.join(process.env.HOME || '', '.claude', 'skills', skillName, 'SKILL.md'),
        path.join(getWsPath(), '.openchat', 'skills', skillName, 'SKILL.md'),
        path.join(getWsPath(), '.skills', skillName, 'SKILL.md'),
        path.join(getWsPath(), 'skills', skillName, 'SKILL.md')
      ];
      let loaded = false;
      for (const skillFile of skillDirs) {
        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf8');
          const preview = content.slice(0, 600);
          results.push(`✔ ${skillName} (loaded from ${path.dirname(skillFile)}):\n${preview}${content.length > 600 ? '...' : ''}`);
          loaded = true;
          break;
        }
      }
      if (!loaded) {
        results.push(`✔ ${skillName}: (built-in skill activated — instructions applied to context)`);
      }
    }
    return `Loaded ${args.skills.length} skill(s):\n\n${results.join('\n\n')}`;
  });

  // skill_resource — Read a skill's resource file
  ToolManager.registerTool({
    name: 'skill_resource',
    description: "Read a specific resource file (template, config, example, script) from a skill's directory.",
    parameters: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill name.' },
        resource: { type: 'string', description: 'Resource file path relative to skill directory (e.g., "templates/component.tsx").' }
      },
      required: ['skill', 'resource']
    }
  }, async (args) => {
    const skillDirs = [
      path.join(process.env.HOME || '', '.config', 'openchat', 'skills', args.skill),
      path.join(process.env.HOME || '', '.claude', 'skills', args.skill),
      path.join(getWsPath(), '.openchat', 'skills', args.skill),
      path.join(getWsPath(), '.skills', args.skill),
      path.join(getWsPath(), 'skills', args.skill)
    ];
    for (const dir of skillDirs) {
      const resourcePath = path.join(dir, args.resource);
      if (fs.existsSync(resourcePath)) {
        const content = fs.readFileSync(resourcePath, 'utf8');
        return `Resource "${args.resource}" from skill "${args.skill}":\n\n${content.slice(0, 6000)}`;
      }
    }
    return `Resource "${args.resource}" not found in skill "${args.skill}". Check that the skill directory exists and the resource path is correct.`;
  });

  // ─────────────────────────────────────────────────────────────
  // 🧩 UTILITIES
  // ─────────────────────────────────────────────────────────────

  // question — Ask the user interactive questions
  ToolManager.registerTool({
    name: 'question',
    description: [
      'Ask the user an interactive question during execution.',
      'Use to clarify requirements, offer choices, or confirm intent.',
      'Provide options array for multiple-choice, or leave empty for open-ended.',
      'Mark your recommended option with "(Recommended)" prefix.',
      'The response will be injected as a user message in the next turn.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask the user.' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: multiple choice options. Mark preferred with "(Recommended)" prefix.'
        },
        recommendation: { type: 'string', description: 'Your recommended option (if options provided).' }
      },
      required: ['question']
    }
  }, async (args) => {
    const optionsList = args.options?.length ? args.options : ['Yes', 'No'];

    return new Promise((resolve) => {
      eventBus.emit('question:request', {
        question: args.question,
        options: optionsList,
        resolve: (answer: string) => {
          resolve(`User selected option: "${answer}"`);
        }
      });
    });
  });

  // todowrite — Maintain structured task tracking list
  ToolManager.registerTool({
    name: 'todowrite',
    description: [
      'Maintain a structured task tracking list during implementation.',
      'Use to track and display progress on multi-step features.',
      'Statuses: pending, in_progress, completed, cancelled.',
      'Priorities: high, medium, low.',
      'Call this to update all tasks — replaces the entire list each call.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: 'Complete list of todo items to set.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Optional: stable ID for this task (e.g., "task-1").' },
              content: { type: 'string', description: 'Task description. Be specific.' },
              status: { type: 'string', description: 'pending | in_progress | completed | cancelled' },
              priority: { type: 'string', description: 'high | medium | low' }
            },
            required: ['content', 'status', 'priority']
          }
        }
      },
      required: ['todos']
    }
  }, async (args) => {
    // Reset and rebuild the todo store
    todoStore.length = 0;
    for (let i = 0; i < args.todos.length; i++) {
      const t = args.todos[i];
      todoStore.push({
        id: t.id || `task-${i + 1}`,
        content: t.content,
        status: t.status || 'pending',
        priority: t.priority || 'medium'
      });
    }

    const statusIcons: Record<string, string> = {
      completed: '✔',
      in_progress: '⠿',
      cancelled: '✖',
      pending: '○'
    };
    const priorityIcons: Record<string, string> = {
      high: '\u{F071}',
      medium: '\u{F05A}',
      low: '\u{F05E2}'
    };

    const counts = {
      completed: todoStore.filter(t => t.status === 'completed').length,
      in_progress: todoStore.filter(t => t.status === 'in_progress').length,
      pending: todoStore.filter(t => t.status === 'pending').length
    };

    const formatted = todoStore.map((t, i) =>
      `${statusIcons[t.status] || '○'} ${priorityIcons[t.priority] || ''} [${i + 1}] ${t.content}`
    ).join('\n');

    return [
      `Task List Updated (${todoStore.length} tasks):`,
      `  ✔ ${counts.completed} completed  ⠿ ${counts.in_progress} in-progress  ○ ${counts.pending} pending`,
      ``,
      formatted
    ].join('\n');
  });

  // sequential_thinking — Multi-step structured reasoning
  ToolManager.registerTool({
    name: 'sequential_thinking',
    description: [
      'Multi-step structured reasoning for complex decisions.',
      'Each "thought" builds on previous ones in a traceable chain.',
      'Supports revisions (isRevision=true) and branching (branchFromThought=N).',
      'Mark the last step with isFinalThought=true to conclude.',
      'Use for: architecture decisions, debugging, trade-off analysis, planning.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Unique ID for this thinking session (e.g., "arch-decision-001"). Create one per distinct problem.' },
        thought: { type: 'string', description: 'The current reasoning step content.' },
        totalThoughts: { type: 'number', description: 'Expected total number of thoughts. Can increase as reasoning evolves.' },
        isRevision: { type: 'boolean', description: 'If true, this revises an earlier thought. Specify reviseThoughtIndex.' },
        reviseThoughtIndex: { type: 'number', description: '0-based index of the thought to revise (used with isRevision=true).' },
        branchFromThought: { type: 'number', description: '0-based index to branch from. Creates an alternative reasoning path.' },
        isFinalThought: { type: 'boolean', description: 'Mark true for the concluding thought to finalize the reasoning chain.' }
      },
      required: ['sessionId', 'thought']
    }
  }, async (args) => {
    const sid = args.sessionId;
    if (!thinkingChains.has(sid)) thinkingChains.set(sid, []);
    const chain = thinkingChains.get(sid)!;

    if (args.isRevision && args.reviseThoughtIndex !== undefined) {
      const idx = args.reviseThoughtIndex;
      if (idx >= 0 && idx < chain.length) {
        chain[idx] = { ...chain[idx], text: `[REVISED] ${args.thought}`, isRevision: true };
        const chainDisplay = chain.map((t, i) => `  ${i + 1}. ${t.text}`).join('\n');
        return `Thought ${idx + 1} revised in session "${sid}". Chain (${chain.length} steps):\n${chainDisplay}`;
      }
    }

    const newThought: typeof chain[0] = {
      index: chain.length,
      text: args.thought,
      isBranch: args.branchFromThought !== undefined,
      branchFrom: args.branchFromThought
    };

    if (args.branchFromThought !== undefined) {
      newThought.text = `[BRANCH from step ${args.branchFromThought + 1}] ${args.thought}`;
    }

    chain.push(newThought);
    const depth = chain.length;
    const totalHint = args.totalThoughts ? ` of ~${args.totalThoughts}` : '';
    const chainDisplay = chain.map((t, i) => `  ${i + 1}. ${t.text}`).join('\n');

    if (args.isFinalThought) {
      return [
        `Reasoning complete — session "${sid}" (${depth}${totalHint} steps):`,
        ``,
        chainDisplay,
        ``,
        `✔ Final conclusion: ${args.thought}`
      ].join('\n');
    }

    return `Thought ${depth}${totalHint} recorded in session "${sid}".\n\nChain so far:\n${chainDisplay}`;
  });

  // ─────────────────────────────────────────────────────────────
  // 🔌 MCP TOOLS
  // ─────────────────────────────────────────────────────────────

  // list_mcp_resources — List all MCP server resources
  ToolManager.registerTool({
    name: 'list_mcp_resources',
    description: [
      'List all resources provided by connected MCP (Model Context Protocol) servers.',
      'Resources can be files, database schemas, application data, etc.',
      'Filter by server name to narrow results.',
      'Configure MCP servers using /mcp command.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        server: { type: 'string', description: 'Optional: filter by MCP server name.' }
      }
    }
  }, async (args) => {
    try {
      // Check database for configured MCP servers
      const db = initDatabase();
      const servers = db.prepare(`SELECT * FROM mcp_servers WHERE enabled = 1`).all() as any[];

      if (servers.length === 0) {
        try {
          const queryTerm = args.server || "popular";
          const q = encodeURIComponent(`model context protocol mcp server github ${queryTerm}`);
          const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}`);
          const webResults = parseDDGResults(html);
          if (webResults.length > 0) {
            const formatted = webResults.map((r: any, _idx: number) => `• ${r.title}\n  Link: ${r.url}\n  Description: ${r.snippet}`).join('\n');
            return [
              'No MCP servers configured or enabled locally.',
              `Here are some recommended public MCP servers found on the internet:`,
              formatted,
              '',
              'To configure and add an MCP server, use the /mcp command.'
            ].join('\n');
          }
        } catch (e) { console.error('[extendedTools] MCP search web fallback 2 failed:', e); }

        return [
          'No MCP servers configured or enabled.',
          '',
          'To add an MCP server, use /mcp in the command palette.',
          'MCP servers can expose files, schemas, database access, and custom tools.'
        ].join('\n');
      }

      const filtered = args.server
        ? servers.filter(s => s.name.toLowerCase().includes(args.server.toLowerCase()))
        : servers;

      if (filtered.length === 0) {
        try {
          const q = encodeURIComponent(`model context protocol mcp server github ${args.server}`);
          const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${q}`);
          const webResults = parseDDGResults(html);
          if (webResults.length > 0) {
            const formatted = webResults.map((r: any, _idx: number) => `• ${r.title}\n  Link: ${r.url}\n  Description: ${r.snippet}`).join('\n');
            return [
              `No local MCP servers matching "${args.server}" were found.`,
              `Searching the internet fallback results found:`,
              formatted,
              ``,
              `You can register these MCP servers using the /mcp command.`
            ].join('\n');
          }
        } catch (e) { console.error('[extendedTools] MCP server search fallback failed:', e); }

        return `No MCP servers matching "${args.server}" found locally.`;
      }

      // Try to get dynamic resources if McpManager supports it
      let dynamicResources: any[] | null = null;
      try {
        dynamicResources = (McpManager as any).listResources
          ? await (McpManager as any).listResources(args.server)
          : null;
      } catch (e) { console.error('[extendedTools] Error listing MCP resources:', e); }

      if (dynamicResources && dynamicResources.length > 0) {
        return `MCP Resources (${dynamicResources.length}):\n${dynamicResources.map((r: any) => `• [${r.server}] ${r.uri} — ${r.name || ''}`).join('\n')}`;
      }

      // Fall back to showing configured servers
      const serverList = filtered.map(s => [
        `• [${s.name}] Status: ${s.status} | Transport: ${s.transport}`,
        `  ${s.command ? `Command: ${s.command}` : s.url ? `URL: ${s.url}` : ''}`,
        `  ${s.description || ''}`
      ].filter(Boolean).join('\n'));

      return `Configured MCP Servers (${filtered.length}):\n\n${serverList.join('\n\n')}\n\nNote: Dynamic resource listing requires the MCP server to be actively connected.`;
    } catch (e: any) {
      return `Failed to list MCP resources: ${e.message}`;
    }
  });

  // list_mcp_resource_templates — List MCP resource templates
  ToolManager.registerTool({
    name: 'list_mcp_resource_templates',
    description: 'List parameterized resource templates from MCP servers. Templates have URI patterns with placeholders (e.g., file://{path}).',
    parameters: {
      type: 'object',
      properties: {
        server: { type: 'string', description: 'Optional: filter by MCP server name.' }
      }
    }
  }, async (args) => {
    try {
      const templates = (McpManager as any).listResourceTemplates
        ? await (McpManager as any).listResourceTemplates(args.server)
        : null;
      if (!templates || templates.length === 0) {
        return [
          'No MCP resource templates available.',
          '',
          'Resource templates are parameterized URIs (e.g., file://{path}) provided by MCP servers.',
          'Connect an MCP server via /mcp to see available templates.'
        ].join('\n');
      }
      return `MCP Resource Templates (${templates.length}):\n${templates.map((t: any) => `• [${t.server}] ${t.uriTemplate} — ${t.name || ''}`).join('\n')}`;
    } catch {
      return 'No MCP servers connected. Use /mcp to configure MCP servers.';
    }
  });

  // read_mcp_resource — Read a specific MCP resource
  ToolManager.registerTool({
    name: 'read_mcp_resource',
    description: 'Read a specific resource from an MCP server using its server name and resource URI.',
    parameters: {
      type: 'object',
      properties: {
        server: { type: 'string', description: 'MCP server name (from list_mcp_resources).' },
        uri: { type: 'string', description: 'Resource URI (from list_mcp_resources or list_mcp_resource_templates).' }
      },
      required: ['uri']
    }
  }, async (args) => {
    try {
      const content = (McpManager as any).readResource
        ? await (McpManager as any).readResource(args.server, args.uri)
        : null;
      if (!content) {
        return [
          `Resource not found: ${args.uri}`,
          '',
          'Make sure:',
          '  1. The MCP server is connected and enabled',
          '  2. The URI matches exactly from list_mcp_resources output',
          `  3. Server "${args.server}" exists and is responding`
        ].join('\n');
      }
      return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    } catch (e: any) {
      return `Failed to read MCP resource "${args.uri}": ${e.message}\nEnsure the server is connected via /mcp.`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 🛠️ TOOL MANAGEMENT UTILITIES
  // ─────────────────────────────────────────────────────────────

  // list_tools — List all registered tools with descriptions
  ToolManager.registerTool({
    name: 'list_tools',
    description: 'List all registered tools with their names, descriptions, and parameter schemas. Use to discover available capabilities.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category: file, shell, web, typescript, agent, skill, utility, mcp.' }
      }
    }
  }, async (args) => {
    const schemas = ToolManager.getToolSchemas();
    const categoryMap: Record<string, string[]> = {
      file: ['read', 'read_file', 'write', 'write_file', 'edit', 'edit_file', 'list_directory', 'grep', 'glob'],
      shell: ['bash', 'git_status', 'git_diff', 'spawn_process', 'read_process', 'write_process', 'kill_process', 'list_processes'],
      web: ['fetch_url_content', 'search_web', 'webfetch', 'websearch', 'websearch_cited'],
      typescript: ['type_check', 'lookup_type', 'list_types'],
      agent: ['delegate', 'delegation_read', 'delegation_list', 'task'],
      skill: ['skill', 'skill_find', 'skill_use', 'skill_resource'],
      utility: ['question', 'todowrite', 'sequential_thinking', 'search_memory', 'list_tools'],
      mcp: ['list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource']
    };

    const filterTools = args.category
      ? (categoryMap[args.category.toLowerCase()] || [])
      : null;

    let output = `Available Tools (${schemas.length} total):\n\n`;

    for (const [cat, toolNames] of Object.entries(categoryMap)) {
      if (filterTools && cat !== args.category?.toLowerCase()) continue;

      const catSchemas = schemas.filter(s => toolNames.includes(s.function.name));
      if (!catSchemas.length) continue;

      const catEmojis: Record<string, string> = {
        file: '📝', shell: '💻', web: '🌐', typescript: '🧠',
        agent: '🤖', skill: '📚', utility: '🧩', mcp: '🔌'
      };

      output += `${catEmojis[cat] || '•'} ${cat.toUpperCase()}\n`;
      for (const schema of catSchemas) {
        const desc = (schema.function.description as string).split('.')[0].slice(0, 80);
        const paramCount = Object.keys(schema.function.parameters.properties || {}).length;
        output += `  • ${schema.function.name.padEnd(28)} ${desc} [${paramCount} params]\n`;
      }
      output += '\n';
    }

    return output.trim();
  });

  // tool_logs — Query tool execution logs from DB
  ToolManager.registerTool({
    name: 'tool_logs',
    description: 'Query the tool execution logs from the database. Shows recent tool calls with status, duration, and arguments.',
    parameters: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Filter logs by tool name.' },
        limit: { type: 'number', description: 'Number of log entries to return. Default: 20.' },
        status: { type: 'string', description: 'Filter by status: success or failure.' }
      }
    }
  }, async (args) => {
    try {
      const db = initDatabase();
      let query = `SELECT * FROM tool_logs`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (args.tool) {
        conditions.push(`tool = ?`);
        params.push(args.tool);
      }
      if (args.status) {
        conditions.push(`status = ?`);
        params.push(args.status);
      }
      if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(args.limit || 20);

      const logs = db.prepare(query).all(...params) as any[];
      if (!logs.length) return `No tool logs found${args.tool ? ` for tool "${args.tool}"` : ''}.`;

      const formatted = logs.map(l => [
        `[${l.created_at}] ${l.tool} — ${l.status === 'success' ? '✔' : '✖'} ${l.duration}ms`,
        `  Args: ${(l.arguments || '{}').slice(0, 100)}`
      ].join('\n')).join('\n');

      return `Tool Logs (${logs.length} entries):\n\n${formatted}`;
    } catch (e: any) {
      return `Failed to query tool logs: ${e.message}`;
    }
  });
}
