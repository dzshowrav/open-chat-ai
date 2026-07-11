import { ToolManager } from '../toolManager.js';
import { exec, spawn, ChildProcess } from 'child_process';
import { stateManager } from '../../core/state.js';
import { eventBus } from '../../core/events.js';
import { initDatabase } from '../../database/connection.js';
import { SessionRepository } from '../../database/repositories/sessionRepository.js';
import { PermissionRepository } from '../../database/repositories/permissionRepository.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// ─────────────────────────────────────────────────────────────
// Shared In-Memory Stores
// ─────────────────────────────────────────────────────────────
interface TaskInfo {
  id: string;
  commandLine: string;
  cwd: string;
  process: ChildProcess;
  output: string;
  exitCode: number | null;
  startedAt: number;
}
const taskStore = new Map<string, TaskInfo>();

interface PersistentTerminal {
  id: string;
  process: ChildProcess;
  outputBuffer: string;
  currentCommandToken: string | null;
  commandResolver: ((out: string) => void) | null;
}
const persistentTerminals = new Map<string, PersistentTerminal>();

interface SubagentConfig {
  name: string;
  description: string;
  system_prompt: string;
  enable_write_tools?: boolean;
  enable_subagent_tools?: boolean;
  enable_mcp_tools?: boolean;
}
const subagentDefinitions = new Map<string, SubagentConfig>();

interface SubagentSession {
  id: string;
  typeName: string;
  role: string;
  prompt: string;
  messages: Array<{ role: string; content: string }>;
  status: 'running' | 'completed' | 'failed';
  result: string;
  startedAt: number;
}
const subagentStore = new Map<string, SubagentSession>();

// Predefine standard subagents
subagentDefinitions.set('research', {
  name: 'research',
  description: 'Research subagent for reading files and exploring',
  system_prompt: 'You are a research assistant. Focus on reading files and gathering facts.',
  enable_write_tools: false
});
subagentDefinitions.set('self', {
  name: 'self',
  description: 'Self-cloned subagent inheriting parent tools',
  system_prompt: 'You are a general programming assistant. Complete the task thoroughly.',
  enable_write_tools: true
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getWsPath(): string {
  return stateManager.getState().workspacePath || process.cwd();
}

function logToolExecution(tool: string, args: any, status: 'success' | 'failure', duration: number): void {
  try {
    const db = initDatabase();
    db.prepare(
      `INSERT INTO tool_logs (tool, arguments, status, duration) VALUES (?, ?, ?, ?)`
    ).run(tool, JSON.stringify(args), status, duration);
  } catch {
    // Ignore logging errors
  }
}

// Convert glob pattern to RegExp
function globToRegex(glob: string): RegExp {
  let escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Handle double asterisk
  escaped = escaped.replace(/\\\*\\\*/g, '.*');
  // Handle single asterisk
  escaped = escaped.replace(/\\\*/g, '[^/]*');
  return new RegExp('^' + escaped + '$', 'i');
}

// Check if file path matches glob pattern list
function matchesFilters(filePath: string, includes?: string[]): boolean {
  if (!includes || includes.length === 0) return true;
  const fileName = path.basename(filePath);
  return includes.some(pattern => {
    if (pattern.startsWith('!')) {
      const regex = globToRegex(pattern.slice(1));
      return !regex.test(fileName) && !regex.test(filePath);
    }
    const regex = globToRegex(pattern);
    return regex.test(fileName) || regex.test(filePath);
  });
}

// Recursive directory traversal for search
function walkDir(dir: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);
    const excludes = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '__pycache__'];
    for (const file of files) {
      if (excludes.includes(file)) continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
  } catch {}
  return fileList;
}

// Fetch helper
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenChat-CLI/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*'
      }
    }, (res) => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function htmlToMarkdown(html: string): string {
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
    .trim();
}

// Fetch DDG Search
function parseDDG(html: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const blockRegex = /<div class="result[^"]*"[\s\S]*?(?=<div class="result[^"]*"|$)/g;
  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(html)) !== null && results.length < 5) {
    const blockHtml = block[0];
    const titleMatch = blockHtml.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;
    let url = titleMatch[1];
    if (url.includes('duckduckgo.com/l/?') || url.startsWith('/l/?')) {
      const uddMatch = url.match(/uddg=([^&]+)/);
      if (uddMatch) url = decodeURIComponent(uddMatch[1]);
    }
    const title = htmlToMarkdown(titleMatch[2]).slice(0, 150);
    const snippetMatch = blockHtml.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? htmlToMarkdown(snippetMatch[1]).slice(0, 300) : '';
    results.push({ title, url, snippet });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// Tool Registration Function
// ─────────────────────────────────────────────────────────────
export function registerNativeTools(): void {

  // 1. view_file
  ToolManager.registerTool({
    name: 'view_file',
    description: 'Read the contents of a file with optional line ranges, offsets, and type support.',
    parameters: {
      type: 'object',
      properties: {
        AbsolutePath: { type: 'string', description: 'Absolute path to target file.' },
        StartLine: { type: 'number', description: 'Start line (1-indexed, inclusive).' },
        EndLine: { type: 'number', description: 'End line (1-indexed, inclusive).' },
        ContentOffset: { type: 'number', description: 'Byte offset to start reading from.' },
        IsSkillFile: { type: 'boolean', description: 'Internal flag set to true if loading skill rules.' }
      },
      required: ['AbsolutePath']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const filePath = path.resolve(args.AbsolutePath);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${args.AbsolutePath}`);
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        throw new Error(`Path is a directory, not a file: ${args.AbsolutePath}`);
      }

      // Handle binary files / images
      const ext = path.extname(filePath).toLowerCase();
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico'];
      if (imageExts.includes(ext)) {
        logToolExecution('view_file', args, 'success', Date.now() - start);
        return `[Binary Image File: ${path.basename(filePath)}] Size: ${stat.size} bytes.`;
      }

      let rawContent = '';
      if (args.ContentOffset) {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(46080);
        fs.readSync(fd, buffer, 0, 46080, args.ContentOffset);
        fs.closeSync(fd);
        rawContent = buffer.toString('utf8');
      } else {
        rawContent = fs.readFileSync(filePath, 'utf8');
      }

      let allLines = rawContent.split('\n');
      const totalLines = allLines.length;

      let startIdx = 0;
      let endIdx = Math.min(800, totalLines);

      if (args.StartLine !== undefined || args.EndLine !== undefined) {
        const s = args.StartLine !== undefined ? args.StartLine - 1 : 0;
        const e = args.EndLine !== undefined ? args.EndLine : s + 800;
        startIdx = Math.max(0, s);
        endIdx = Math.min(totalLines, e);
      }

      const sliced = allLines.slice(startIdx, endIdx);
      const numbered = sliced.map((line, idx) => `${String(startIdx + idx + 1).padStart(5, ' ')}: ${line}`).join('\n');

      let output = `File: ${filePath} | Lines ${startIdx + 1}–${endIdx} of ${totalLines} | Size: ${stat.size} bytes\n\n${numbered}`;
      if (endIdx < totalLines) {
        output += `\n\n[TRUNCATED] Content extends beyond line ${endIdx}.`;
      }

      logToolExecution('view_file', args, 'success', Date.now() - start);
      return output;
    } catch (err: any) {
      logToolExecution('view_file', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 2. list_dir
  ToolManager.registerTool({
    name: 'list_dir',
    description: 'List contents of a directory, including sizes and item counts.',
    parameters: {
      type: 'object',
      properties: {
        DirectoryPath: { type: 'string', description: 'Absolute path to target directory.' }
      },
      required: ['DirectoryPath']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const dirPath = path.resolve(args.DirectoryPath);
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory does not exist: ${args.DirectoryPath}`);
      }
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is a file, not a directory: ${args.DirectoryPath}`);
      }

      const files = fs.readdirSync(dirPath);
      const entries = files.map(file => {
        const full = path.join(dirPath, file);
        try {
          const s = fs.statSync(full);
          if (s.isDirectory()) {
            let childCount = 0;
            try { childCount = fs.readdirSync(full).length; } catch {}
            return `DIR  ${file} (${childCount} items)`;
          } else {
            return `FILE ${file} (${s.size} bytes)`;
          }
        } catch {
          return `UNKNOWN ${file}`;
        }
      });

      logToolExecution('list_dir', args, 'success', Date.now() - start);
      return `Contents of ${dirPath} (${files.length} items):\n\n${entries.join('\n')}`;
    } catch (err: any) {
      logToolExecution('list_dir', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 3. write_to_file
  ToolManager.registerTool({
    name: 'write_to_file',
    description: 'Create a new file or completely overwrite an existing one.',
    parameters: {
      type: 'object',
      properties: {
        TargetFile: { type: 'string', description: 'Absolute path of file to write.' },
        Overwrite: { type: 'boolean', description: 'Set true to overwrite if file exists.' },
        CodeContent: { type: 'string', description: 'Full text content to write.' },
        Description: { type: 'string', description: 'Description of the write rationale.' },
        ArtifactMetadata: {
          type: 'object',
          properties: {
            Summary: { type: 'string' },
            UserFacing: { type: 'boolean' },
            RequestFeedback: { type: 'boolean' }
          }
        }
      },
      required: ['TargetFile', 'Overwrite', 'CodeContent', 'Description']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const filePath = path.resolve(args.TargetFile);
      if (fs.existsSync(filePath) && !args.Overwrite) {
        throw new Error(`File already exists at ${args.TargetFile}. Set Overwrite=true to overwrite.`);
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, args.CodeContent, 'utf8');

      logToolExecution('write_to_file', args, 'success', Date.now() - start);
      return `File written successfully: ${args.TargetFile} (${args.CodeContent.split('\n').length} lines, ${Buffer.byteLength(args.CodeContent)} bytes). Rationale: ${args.Description}`;
    } catch (err: any) {
      logToolExecution('write_to_file', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 4. replace_file_content
  ToolManager.registerTool({
    name: 'replace_file_content',
    description: 'Replace a single contiguous block of code in a file.',
    parameters: {
      type: 'object',
      properties: {
        TargetFile: { type: 'string', description: 'Absolute path of file to edit.' },
        StartLine: { type: 'number', description: 'Start line of range enclosing target (1-indexed).' },
        EndLine: { type: 'number', description: 'End line of range enclosing target (1-indexed).' },
        TargetContent: { type: 'string', description: 'Exact content block to search for.' },
        ReplacementContent: { type: 'string', description: 'Content to replace with.' },
        AllowMultiple: { type: 'boolean', description: 'True if multiple matching instances are okay.' },
        Description: { type: 'string', description: 'Explanation of changes.' },
        Instruction: { type: 'string', description: 'Surgical instructions.' },
        TargetLintErrorIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['TargetFile', 'StartLine', 'EndLine', 'TargetContent', 'ReplacementContent', 'AllowMultiple', 'Description', 'Instruction']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const filePath = path.resolve(args.TargetFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${args.TargetFile}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');

      const s = Math.max(0, args.StartLine - 1);
      const e = Math.min(lines.length, args.EndLine);
      const targetLines = lines.slice(s, e).join('\n');

      if (!targetLines.includes(args.TargetContent)) {
        throw new Error(`TargetContent not found in specified range [Lines ${args.StartLine}-${args.EndLine}] of file ${args.TargetFile}.`);
      }

      const occurrences = (targetLines.split(args.TargetContent).length - 1);
      if (occurrences > 1 && !args.AllowMultiple) {
        throw new Error(`Found multiple occurrences (${occurrences}) of TargetContent in range [Lines ${args.StartLine}-${args.EndLine}].`);
      }

      const replacedRange = targetLines.replace(args.TargetContent, args.ReplacementContent);
      const before = lines.slice(0, s);
      const after = lines.slice(e);

      const finalContent = [...before, replacedRange, ...after].join('\n');
      fs.writeFileSync(filePath, finalContent, 'utf8');

      logToolExecution('replace_file_content', args, 'success', Date.now() - start);
      return `Successfully replaced content in ${args.TargetFile}. Rationale: ${args.Description}`;
    } catch (err: any) {
      logToolExecution('replace_file_content', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 5. multi_replace_file_content
  ToolManager.registerTool({
    name: 'multi_replace_file_content',
    description: 'Perform multiple non-contiguous edits in a single file.',
    parameters: {
      type: 'object',
      properties: {
        TargetFile: { type: 'string', description: 'Absolute path of file to edit.' },
        Instruction: { type: 'string', description: 'Overview instruction.' },
        Description: { type: 'string', description: 'Detailed rationale.' },
        ReplacementChunks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              StartLine: { type: 'number' },
              EndLine: { type: 'number' },
              TargetContent: { type: 'string' },
              ReplacementContent: { type: 'string' },
              AllowMultiple: { type: 'boolean' }
            },
            required: ['StartLine', 'EndLine', 'TargetContent', 'ReplacementContent', 'AllowMultiple']
          }
        },
        ArtifactMetadata: {
          type: 'object',
          properties: {
            Summary: { type: 'string' },
            UserFacing: { type: 'boolean' },
            RequestFeedback: { type: 'boolean' }
          }
        },
        TargetLintErrorIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['TargetFile', 'Instruction', 'Description', 'ReplacementChunks']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const filePath = path.resolve(args.TargetFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${args.TargetFile}`);
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let lines = content.split('\n');

      // Sort chunks in descending order of StartLine to preserve indices during replacements
      const sortedChunks = [...args.ReplacementChunks].sort((a, b) => b.StartLine - a.StartLine);

      for (const chunk of sortedChunks) {
        const s = Math.max(0, chunk.StartLine - 1);
        const e = Math.min(lines.length, chunk.EndLine);
        const chunkLines = lines.slice(s, e).join('\n');

        if (!chunkLines.includes(chunk.TargetContent)) {
          throw new Error(`TargetContent not found in specified range [Lines ${chunk.StartLine}-${chunk.EndLine}] for chunk replacement.`);
        }

        const occurrences = (chunkLines.split(chunk.TargetContent).length - 1);
        if (occurrences > 1 && !chunk.AllowMultiple) {
          throw new Error(`Found multiple occurrences (${occurrences}) of TargetContent in range [Lines ${chunk.StartLine}-${chunk.EndLine}] for a chunk.`);
        }

        const replacedRange = chunkLines.replace(chunk.TargetContent, chunk.ReplacementContent);
        lines.splice(s, e - s, replacedRange);
      }

      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

      logToolExecution('multi_replace_file_content', args, 'success', Date.now() - start);
      return `Successfully completed ${args.ReplacementChunks.length} chunk replacements in ${args.TargetFile}. Rationale: ${args.Description}`;
    } catch (err: any) {
      logToolExecution('multi_replace_file_content', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 6. grep_search
  ToolManager.registerTool({
    name: 'grep_search',
    description: 'Perform high-performance regex or literal content search in workspace files.',
    parameters: {
      type: 'object',
      properties: {
        SearchPath: { type: 'string', description: 'Absolute path to directory to search.' },
        Query: { type: 'string', description: 'Search term or regex pattern.' },
        IsRegex: { type: 'boolean', description: 'True to treat Query as a RegExp.' },
        MatchPerLine: { type: 'boolean', description: 'True to return line number and line contents.' },
        CaseInsensitive: { type: 'boolean', description: 'True for case-insensitive search.' },
        Includes: { type: 'array', items: { type: 'string' } }
      },
      required: ['SearchPath', 'Query']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const searchDir = path.resolve(args.SearchPath);
      if (!fs.existsSync(searchDir)) {
        throw new Error(`Search path does not exist: ${args.SearchPath}`);
      }

      const allFiles = walkDir(searchDir);
      const matches: any[] = [];
      const queryRegex = args.IsRegex 
        ? new RegExp(args.Query, args.CaseInsensitive ? 'i' : '') 
        : new RegExp(args.Query.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'), args.CaseInsensitive ? 'i' : '');

      for (const filePath of allFiles) {
        if (!matchesFilters(filePath, args.Includes)) continue;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (args.MatchPerLine) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (queryRegex.test(line)) {
                matches.push({
                  Filename: path.relative(searchDir, filePath),
                  LineNumber: idx + 1,
                  LineContent: line.trim()
                });
              }
            });
          } else {
            if (queryRegex.test(content)) {
              matches.push({ Filename: path.relative(searchDir, filePath) });
            }
          }
        } catch {}
        if (matches.length >= 50) break; // Cap results
      }

      logToolExecution('grep_search', args, 'success', Date.now() - start);
      return JSON.stringify(matches.slice(0, 50), null, 2);
    } catch (err: any) {
      logToolExecution('grep_search', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 7. run_command
  ToolManager.registerTool({
    name: 'run_command',
    description: 'Execute a bash command with background task support and persistent terminal sessions.',
    parameters: {
      type: 'object',
      properties: {
        CommandLine: { type: 'string', description: 'Bash command string.' },
        Cwd: { type: 'string', description: 'Working directory.' },
        RunPersistent: { type: 'boolean', description: 'True to spawn in persistent bash shell.' },
        RequestedTerminalID: { type: 'string', description: 'Stable ID for persistent terminal.' },
        WaitMsBeforeAsync: { type: 'number', description: 'Time to wait before async backgrounding (ms).' }
      },
      required: ['CommandLine', 'Cwd', 'WaitMsBeforeAsync']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const cwd = path.resolve(args.Cwd);
      const waitTime = args.WaitMsBeforeAsync;

      if (args.RunPersistent) {
        const termId = args.RequestedTerminalID || `term_${Date.now()}`;
        let term = persistentTerminals.get(termId);

        if (!term) {
          const shellCmd = fs.existsSync('/data/data/com.termux/files/usr/bin/bash') ? '/data/data/com.termux/files/usr/bin/bash' : 'bash';
          const proc = spawn(shellCmd, [], { cwd, env: process.env, shell: true });
          term = {
            id: termId,
            process: proc,
            outputBuffer: '',
            currentCommandToken: null,
            commandResolver: null
          };

          proc.stdout?.on('data', (d: Buffer) => {
            const txt = d.toString();
            term!.outputBuffer += txt;
            if (term!.currentCommandToken && term!.outputBuffer.includes(term!.currentCommandToken)) {
              if (term!.commandResolver) {
                const resolver = term!.commandResolver;
                term!.commandResolver = null;
                const token = term!.currentCommandToken;
                term!.currentCommandToken = null;

                // Split at token to return the command output
                const parts = term!.outputBuffer.split(token);
                resolver(parts[0]);
                term!.outputBuffer = parts.slice(1).join(token);
              }
            }
          });

          proc.stderr?.on('data', (d: Buffer) => {
            term!.outputBuffer += d.toString();
          });

          proc.on('close', () => {
            persistentTerminals.delete(termId);
          });

          persistentTerminals.set(termId, term);
        }

        const token = `__CMD_DONE_${Date.now()}__`;
        term.currentCommandToken = token;
        term.outputBuffer = '';

        const outputPromise = new Promise<string>((resolve) => {
          term!.commandResolver = resolve;
        });

        term.process.stdin?.write(`${args.CommandLine}\necho ${token} $?\n`);

        const result = await Promise.race([
          outputPromise,
          new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT_BACKGROUNDED'), waitTime))
        ]);

        if (result === 'TIMEOUT_BACKGROUNDED') {
          // Send task to background
          const taskId = `task_${Date.now()}`;
          const taskInfo: TaskInfo = {
            id: taskId,
            commandLine: args.CommandLine,
            cwd,
            process: term.process,
            output: '',
            exitCode: null,
            startedAt: Date.now()
          };
          taskStore.set(taskId, taskInfo);
          logToolExecution('run_command', args, 'success', Date.now() - start);
          return `Command timed out but is executing in persistent terminal ${termId} (Background Task ID: ${taskId}).`;
        }

        logToolExecution('run_command', args, 'success', Date.now() - start);
        return result as string;
      } else {
        // Standard non-persistent command
        const child = spawn(args.CommandLine, [], { cwd, shell: true, env: process.env });
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (d: Buffer) => stdout += d.toString());
        child.stderr?.on('data', (d: Buffer) => stderr += d.toString());

        const taskFinished = new Promise<{ code: number | null }>((resolve) => {
          child.on('close', (code) => resolve({ code }));
        });

        const timeoutRes = await Promise.race([
          taskFinished,
          new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT_BACKGROUNDED'), waitTime))
        ]);

        if (timeoutRes === 'TIMEOUT_BACKGROUNDED') {
          const taskId = `task_${Date.now()}`;
          const taskInfo: TaskInfo = {
            id: taskId,
            commandLine: args.CommandLine,
            cwd,
            process: child,
            output: stdout + stderr,
            exitCode: null,
            startedAt: Date.now()
          };
          taskStore.set(taskId, taskInfo);

          child.on('close', (code) => {
            taskInfo.exitCode = code;
          });

          logToolExecution('run_command', args, 'success', Date.now() - start);
          return `Process started in background. Task ID: ${taskId}`;
        } else {
          const { code } = timeoutRes as { code: number | null };
          logToolExecution('run_command', args, 'success', Date.now() - start);
          return `Command finished with exit code ${code}.\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}`;
        }
      }
    } catch (err: any) {
      logToolExecution('run_command', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 8. command_status
  ToolManager.registerTool({
    name: 'command_status',
    description: 'Check status of a running background command.',
    parameters: {
      type: 'object',
      properties: {
        CommandId: { type: 'string', description: 'Task ID of the background command.' },
        WaitDurationSeconds: { type: 'number', description: 'Seconds to wait for completion before returning status.' },
        OutputCharacterCount: { type: 'number', description: 'Max characters of output to return.' }
      },
      required: ['CommandId', 'WaitDurationSeconds']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const task = taskStore.get(args.CommandId);
      if (!task) {
        throw new Error(`Command/Task ID not found: ${args.CommandId}`);
      }

      if (task.exitCode === null && args.WaitDurationSeconds > 0) {
        await Promise.race([
          new Promise<void>((resolve) => {
            task.process.on('close', () => resolve());
          }),
          new Promise<void>((resolve) => setTimeout(resolve, args.WaitDurationSeconds * 1000))
        ]);
      }

      const status = task.exitCode !== null ? 'done' : 'running';
      const outputLimit = args.OutputCharacterCount || 2000;
      const recentOutput = task.output.slice(-outputLimit);

      logToolExecution('command_status', args, 'success', Date.now() - start);
      return JSON.stringify({
        status,
        exitCode: task.exitCode,
        output: recentOutput
      }, null, 2);
    } catch (err: any) {
      logToolExecution('command_status', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 9. manage_task
  ToolManager.registerTool({
    name: 'manage_task',
    description: 'Manage active background tasks.',
    parameters: {
      type: 'object',
      properties: {
        Action: { type: 'string', description: 'Action: list | kill | status | send_input' },
        TaskId: { type: 'string', description: 'Task ID to manage.' },
        Input: { type: 'string', description: 'Input text to send to task stdin.' }
      },
      required: ['Action']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      if (args.Action === 'list') {
        const tasksList = Array.from(taskStore.entries()).map(([id, t]) => ({
          TaskId: id,
          CommandLine: t.commandLine,
          Status: t.exitCode !== null ? 'Exited' : 'Running',
          ExitCode: t.exitCode
        }));
        logToolExecution('manage_task', args, 'success', Date.now() - start);
        return JSON.stringify(tasksList, null, 2);
      }

      const task = taskStore.get(args.TaskId);
      if (!task) {
        throw new Error(`Task ID not found: ${args.TaskId}`);
      }

      if (args.Action === 'kill') {
        task.process.kill('SIGTERM');
        logToolExecution('manage_task', args, 'success', Date.now() - start);
        return `Killed task ${args.TaskId} successfully.`;
      }

      if (args.Action === 'send_input') {
        if (task.process.stdin) {
          task.process.stdin.write(args.Input || '');
          logToolExecution('manage_task', args, 'success', Date.now() - start);
          return `Input sent to task ${args.TaskId}.`;
        } else {
          throw new Error(`Task ${args.TaskId} stdin is not available.`);
        }
      }

      if (args.Action === 'status') {
        logToolExecution('manage_task', args, 'success', Date.now() - start);
        return JSON.stringify({
          TaskId: args.TaskId,
          CommandLine: task.commandLine,
          Status: task.exitCode !== null ? 'Exited' : 'Running',
          ExitCode: task.exitCode,
          OutputPreview: task.output.slice(-1000)
        }, null, 2);
      }

      throw new Error(`Invalid action: ${args.Action}`);
    } catch (err: any) {
      logToolExecution('manage_task', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 10. read_url_content
  ToolManager.registerTool({
    name: 'read_url_content',
    description: 'Fetch and parse public URL contents to clean Markdown.',
    parameters: {
      type: 'object',
      properties: {
        Url: { type: 'string', description: 'HTTP/HTTPS URL to fetch.' }
      },
      required: ['Url']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const html = await fetchUrl(args.Url);
      const markdown = htmlToMarkdown(html);
      logToolExecution('read_url_content', args, 'success', Date.now() - start);
      return markdown.slice(0, 15000);
    } catch (err: any) {
      logToolExecution('read_url_content', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 11. search_web
  ToolManager.registerTool({
    name: 'search_web',
    description: 'Search the web using DuckDuckGo with domain hints.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords.' },
        domain: { type: 'string', description: 'Filter search results to this domain.' }
      },
      required: ['query']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      let finalQuery = args.query;
      if (args.domain) {
        finalQuery += ` site:${args.domain}`;
      }
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(finalQuery)}`;
      const html = await fetchUrl(searchUrl);
      const results = parseDDG(html);

      const formatted = results.map((r, idx) => `[${idx + 1}] **${r.title}**\n   Link: ${r.url}\n   Snippet: ${r.snippet}`).join('\n\n');

      logToolExecution('search_web', args, 'success', Date.now() - start);
      return `Web Search Results for "${args.query}":\n\n${formatted}`;
    } catch (err: any) {
      logToolExecution('search_web', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 12. define_subagent
  ToolManager.registerTool({
    name: 'define_subagent',
    description: 'Define a custom subagent preset for the current session.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the subagent.' },
        description: { type: 'string', description: 'Description of subagent job.' },
        system_prompt: { type: 'string', description: 'System prompt rules.' },
        enable_write_tools: { type: 'boolean' },
        enable_subagent_tools: { type: 'boolean' },
        enable_mcp_tools: { type: 'boolean' }
      },
      required: ['name', 'description', 'system_prompt']
    }
  }, async (args) => {
    const start = Date.now();
    subagentDefinitions.set(args.name, {
      name: args.name,
      description: args.description,
      system_prompt: args.system_prompt,
      enable_write_tools: args.enable_write_tools,
      enable_subagent_tools: args.enable_subagent_tools,
      enable_mcp_tools: args.enable_mcp_tools
    });
    logToolExecution('define_subagent', args, 'success', Date.now() - start);
    return `Successfully defined custom subagent: ${args.name}`;
  });

  // 13. invoke_subagent
  ToolManager.registerTool({
    name: 'invoke_subagent',
    description: 'Spawn background subagent completions.',
    parameters: {
      type: 'object',
      properties: {
        Subagents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              TypeName: { type: 'string' },
              Role: { type: 'string' },
              Prompt: { type: 'string' },
              Workspace: { type: 'string' }
            },
            required: ['TypeName', 'Role', 'Prompt']
          }
        }
      },
      required: ['Subagents']
    }
  }, async (args) => {
    const start = Date.now();
    const list: string[] = [];

    for (const sub of args.Subagents) {
      const def = subagentDefinitions.get(sub.TypeName);
      const prompt = sub.Prompt;
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const session: SubagentSession = {
        id: conversationId,
        typeName: sub.TypeName,
        role: sub.Role,
        prompt,
        messages: [{ role: 'user', content: prompt }],
        status: 'running',
        result: '',
        startedAt: Date.now()
      };
      subagentStore.set(conversationId, session);

      // Execute AI completion asynchronously
      setImmediate(async () => {
        try {
          const { ApiEngine } = await import('../../api/apiEngine.js');
          const { ProviderRepository } = await import('../../database/repositories/providerRepository.js');

          const provRepo = new ProviderRepository();
          const st = stateManager.getState();
          const provider = st.activeProviderId ? provRepo.getProvider(st.activeProviderId) : null;
          const model = st.activeModelId || null;

          if (!provider || !model) {
            session.status = 'completed';
            session.result = `No provider or model configured for subagent execution.`;
            return;
          }

          const systemPrompt = def ? def.system_prompt : 'You are a general assistant.';
          const chatRes = await ApiEngine.chatCompletion({
            provider,
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...session.messages
            ] as any,
            stream: false
          });

          session.status = 'completed';
          session.result = chatRes.content || '[No response]';
          session.messages.push({ role: 'assistant', content: session.result });

          // Notify parent via eventBus (cast to any for custom subagent event)
          (eventBus as any).emit('subagent:finished', { conversationId, result: session.result });
        } catch (err: any) {
          session.status = 'failed';
          session.result = err.message;
        }
      });

      list.push(`- Spelled ID: ${conversationId} | Role: ${sub.Role} | Type: ${sub.TypeName}`);
    }

    logToolExecution('invoke_subagent', args, 'success', Date.now() - start);
    return `Invoked ${args.Subagents.length} subagents:\n\n${list.join('\n')}\n\nUse manage_subagents or send_message to interact.`;
  });

  // 14. manage_subagents
  ToolManager.registerTool({
    name: 'manage_subagents',
    description: 'Manage active subagents.',
    parameters: {
      type: 'object',
      properties: {
        Action: { type: 'string', description: 'Action: list | kill | kill_all' },
        ConversationIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['Action']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      if (args.Action === 'list') {
        const list = Array.from(subagentStore.entries()).map(([id, s]) => ({
          ConversationId: id,
          Type: s.typeName,
          Role: s.role,
          Status: s.status,
          ResultLength: s.result.length
        }));
        logToolExecution('manage_subagents', args, 'success', Date.now() - start);
        return JSON.stringify(list, null, 2);
      }

      if (args.Action === 'kill_all') {
        subagentStore.clear();
        logToolExecution('manage_subagents', args, 'success', Date.now() - start);
        return `Killed all active subagents.`;
      }

      if (args.Action === 'kill') {
        for (const cid of (args.ConversationIds || [])) {
          subagentStore.delete(cid);
        }
        logToolExecution('manage_subagents', args, 'success', Date.now() - start);
        return `Killed specified subagents.`;
      }

      throw new Error(`Invalid subagents action: ${args.Action}`);
    } catch (err: any) {
      logToolExecution('manage_subagents', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 15. send_message
  ToolManager.registerTool({
    name: 'send_message',
    description: 'Send a message to another agent by its conversation ID.',
    parameters: {
      type: 'object',
      properties: {
        Recipient: { type: 'string', description: 'Target conversation ID.' },
        Message: { type: 'string', description: 'Message contents.' }
      },
      required: ['Recipient', 'Message']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const session = subagentStore.get(args.Recipient);
      if (!session) {
        throw new Error(`Subagent conversation not found: ${args.Recipient}`);
      }

      session.messages.push({ role: 'user', content: args.Message });
      session.status = 'running';

      // Re-trigger completion
      setImmediate(async () => {
        try {
          const { ApiEngine } = await import('../../api/apiEngine.js');
          const { ProviderRepository } = await import('../../database/repositories/providerRepository.js');

          const provRepo = new ProviderRepository();
          const st = stateManager.getState();
          const provider = st.activeProviderId ? provRepo.getProvider(st.activeProviderId) : null;
          const model = st.activeModelId || null;

          if (!provider || !model) {
            session.status = 'completed';
            session.result = `No provider or model configured.`;
            return;
          }

          const def = subagentDefinitions.get(session.typeName);
          const systemPrompt = def ? def.system_prompt : 'You are a general assistant.';

          const chatRes = await ApiEngine.chatCompletion({
            provider,
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...session.messages
            ] as any,
            stream: false
          });

          session.status = 'completed';
          session.result = chatRes.content || '[No response]';
          session.messages.push({ role: 'assistant', content: session.result });

          (eventBus as any).emit('subagent:finished', { conversationId: session.id, result: session.result });
        } catch (err: any) {
          session.status = 'failed';
          session.result = err.message;
        }
      });

      logToolExecution('send_message', args, 'success', Date.now() - start);
      return `Message sent to subagent ${args.Recipient}. Completion started.`;
    } catch (err: any) {
      logToolExecution('send_message', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 16. generate_image
  ToolManager.registerTool({
    name: 'generate_image',
    description: 'Generate or edit images based on a text prompt.',
    parameters: {
      type: 'object',
      properties: {
        Prompt: { type: 'string', description: 'Text description of image to generate.' },
        ImageName: { type: 'string', description: 'Target filename (all lowercase, no spaces).' },
        AspectRatio: { type: 'string', description: 'Optional aspect ratio (e.g. 1:1, 16:9).' },
        ImagePaths: { type: 'array', items: { type: 'string' } }
      },
      required: ['Prompt', 'ImageName']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const wsPath = getWsPath();
      const outputFilename = `${args.ImageName.toLowerCase().replace(/\s+/g, '_')}.jpg`;
      const outputPath = path.join(wsPath, outputFilename);

      // Download from Pollinations.ai free generation API
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.Prompt)}?nologo=true`;

      await new Promise<void>((resolve, reject) => {
        https.get(pollUrl, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Pollinations API returned status code ${res.statusCode}`));
            return;
          }
          const stream = fs.createWriteStream(outputPath);
          res.pipe(stream);
          stream.on('finish', () => {
            stream.close();
            resolve();
          });
        }).on('error', reject);
      });

      logToolExecution('generate_image', args, 'success', Date.now() - start);
      return `Successfully generated image and saved as artifact at ${outputPath}`;
    } catch (err: any) {
      logToolExecution('generate_image', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 17. schedule
  ToolManager.registerTool({
    name: 'schedule',
    description: 'Schedule a background notification or recurring cron timer.',
    parameters: {
      type: 'object',
      properties: {
        Prompt: { type: 'string', description: 'Notification message.' },
        DurationSeconds: { type: 'string', description: 'Wait duration for one-shot timer.' },
        CronExpression: { type: 'string', description: 'Standard cron string for recurring triggers.' },
        MaxIterations: { type: 'string', description: 'Limit iterations for cron.' },
        TimerCondition: { type: 'string', description: 'Early termination trigger (any, never, or TaskId).' }
      },
      required: ['Prompt']
    }
  }, async (args) => {
    const start = Date.now();
    const scheduleId = `sched_${Date.now()}`;
    const sessRepo = new SessionRepository();
    const st = stateManager.getState();
    const sessionId = st.activeSessionId;

    if (args.DurationSeconds) {
      const secs = parseInt(args.DurationSeconds, 10);
      setTimeout(() => {
        if (sessionId) {
          try {
            sessRepo.addMessage({
              session_id: sessionId,
              role: 'system',
              content: `\u{F0A2} TIMER NOTIFICATION: ${args.Prompt}`
            });
            // Force redraw/refresh
            eventBus.emit('session:updated', { sessionId });
          } catch {}
        }
      }, secs * 1000);

      logToolExecution('schedule', args, 'success', Date.now() - start);
      return `Successfully scheduled one-shot timer ID ${scheduleId} for ${secs} seconds.`;
    }

    logToolExecution('schedule', args, 'success', Date.now() - start);
    return `Scheduled recurring job ${scheduleId}.`;
  });

  // 18. ask_question
  ToolManager.registerTool({
    name: 'ask_question',
    description: 'Ask the user a multiple-choice question in the terminal UI.',
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              is_multi_select: { type: 'boolean' }
            },
            required: ['question', 'options']
          }
        }
      },
      required: ['questions']
    }
  }, async (args) => {
    const start = Date.now();
    const q = args.questions?.[0];
    if (!q) {
      throw new Error("No questions provided.");
    }

    return new Promise((resolve) => {
      eventBus.emit('question:request', {
        question: q.question,
        options: q.options || [],
        resolve: (answer: string) => {
          logToolExecution('ask_question', args, 'success', Date.now() - start);
          resolve(`User selected option: "${answer}"`);
        }
      });
    });
  });

  // 19. ask_permission
  ToolManager.registerTool({
    name: 'ask_permission',
    description: 'Ask user for explicit security permissions.',
    parameters: {
      type: 'object',
      properties: {
        Action: { type: 'string', description: 'Sensitive permission category.' },
        Target: { type: 'string', description: 'Target identifier (filepath, command prefix, etc).' },
        Reason: { type: 'string', description: 'Explanation of why this is needed.' }
      },
      required: ['Action', 'Target', 'Reason']
    }
  }, async (args) => {
    const start = Date.now();
    const permRepo = new PermissionRepository();

    return new Promise((resolve) => {
      eventBus.emit('permission:request', {
        toolName: args.Action,
        args: { target: args.Target, reason: args.Reason },
        resolve: (decision: 'always_allow' | 'allow_once' | 'deny') => {
          if (decision === 'always_allow') {
            permRepo.setPermission(args.Target, 'always_allow');
          }
          logToolExecution('ask_permission', args, 'success', Date.now() - start);
          resolve(`Permission request resolved: ${decision}`);
        }
      });
    });
  });

  // 20. list_permissions
  ToolManager.registerTool({
    name: 'list_permissions',
    description: 'List all currently active permission grants in this session.',
    parameters: {
      type: 'object',
      properties: {}
    }
  }, async (args) => {
    const start = Date.now();
    const permRepo = new PermissionRepository();
    const permissions = permRepo.listPermissions();
    logToolExecution('list_permissions', args, 'success', Date.now() - start);
    return JSON.stringify(permissions, null, 2);
  });
}
