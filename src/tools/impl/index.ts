import { ToolManager } from '../toolManager.js';
import fs from 'fs';
import path from 'path';
import { execSync, exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
const asyncExec = promisify(exec);
import { stateManager } from '../../core/state.js';
import { SessionRepository } from '../../database/repositories/sessionRepository.js';
import { registerExtendedTools } from './extendedTools.js';
import { registerNativeTools } from './nativeTools.js';
import { initDatabase } from '../../database/connection.js';

const activeProcesses = new Map<string, { process: ChildProcess; output: string; exitCode: number | null }>();

// Safety helper to verify file paths stay inside the active workspace
function getSafePath(relativePath: string, explicit_permission?: boolean): string {
  const wsPath = stateManager.getState().workspacePath;
  // Handle absolute paths for files outside workspace (with explicit_permission)
  const resolved = path.isAbsolute(relativePath)
    ? path.resolve(relativePath)
    : path.resolve(wsPath, relativePath);
  if (!resolved.startsWith(wsPath) && !explicit_permission) {
    throw new Error(
      'SECURITY VIOLATION: Path is outside the active workspace boundary. ' +
      'You MUST output a message asking the user for explicit confirmation before accessing this file. ' +
      'If the user agrees, run this tool again with explicit_permission=true.'
    );
  }
  return resolved;
}

// Log tool execution to DB (non-blocking)
function logToolExecution(tool: string, args: any, status: 'success' | 'failure', duration: number): void {
  try {
    const db = initDatabase();
    db.prepare(
      `INSERT INTO tool_logs (tool, arguments, status, duration) VALUES (?, ?, ?, ?)`
    ).run(tool, JSON.stringify(args), status, duration);
  } catch {
    // Ignore logging errors - never crash the tool itself
  }
}

export function registerBuiltInTools(): void {

  // ─────────────────────────────────────────────────────────
  // 📝 FILE OPERATIONS
  // ─────────────────────────────────────────────────────────

  // 1. read — Read files and directories with pagination
  ToolManager.registerTool({
    name: 'read',
    description: [
      'Read the contents of a file or list a directory. Returns content with line numbers.',
      'Supports images (returns description), PDFs, and text files.',
      'Use offset and limit for pagination on large files (offset=line number, limit=max lines).',
      'For directories, returns one entry per line with type, size, and child count.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to read. Can be a file or directory.' },
        offset: { type: 'number', description: 'Line offset to start reading from (1-indexed). Default: 1.' },
        limit: { type: 'number', description: 'Max number of lines to return. Default: 200.' },
        explicit_permission: { type: 'boolean', description: 'Set true if user explicitly confirmed access outside workspace.' }
      },
      required: ['path']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);

      if (!fs.existsSync(safePath)) {
        throw new Error(`Path does not exist: ${args.path}`);
      }

      const stat = fs.statSync(safePath);

      // Directory listing
      if (stat.isDirectory()) {
        const items = fs.readdirSync(safePath);
        const entries = items.map(item => {
          const itemPath = path.join(safePath, item);
          try {
            const s = fs.statSync(itemPath);
            const isDir = s.isDirectory();
            const size = isDir ? '' : `${s.size}B`;
            let children = '';
            if (isDir) {
              try { children = ` (${fs.readdirSync(itemPath).length} items)`; } catch {}
            }
            return `${isDir ? 'DIR ' : 'FILE'} ${item}${isDir ? children : `  ${size}`}`;
          } catch {
            return `???? ${item}`;
          }
        });
        const result = `Directory listing: ${args.path} (${items.length} items)\n\n${entries.join('\n')}`;
        logToolExecution('read', args, 'success', Date.now() - start);
        return result;
      }

      // Binary / image detection
      const ext = path.extname(safePath).toLowerCase();
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico'];
      if (imageExts.includes(ext)) {
        const size = stat.size;
        logToolExecution('read', args, 'success', Date.now() - start);
        return `[Image file: ${args.path}] Size: ${size} bytes, Format: ${ext.slice(1).toUpperCase()}. Use write_file or bash to process images.`;
      }

      // Text file reading with line-number pagination
      const rawContent = fs.readFileSync(safePath, 'utf8');
      const allLines = rawContent.split('\n');
      const total = allLines.length;
      const offset = Math.max(1, args.offset || 1);
      const limit = args.limit || 200;
      const startIdx = offset - 1;
      const endIdx = Math.min(startIdx + limit, total);
      const slice = allLines.slice(startIdx, endIdx);

      const numbered = slice.map((line, i) => {
        const lineNum = String(startIdx + i + 1).padStart(String(total).length, ' ');
        return `${lineNum}: ${line}`;
      }).join('\n');

      let header = `File: ${args.path} | Lines ${offset}–${endIdx} of ${total} | ${stat.size} bytes`;
      if (endIdx < total) {
        header += `\n[TRUNCATED] Next: offset=${endIdx + 1}, limit=${limit}`;
      }

      logToolExecution('read', args, 'success', Date.now() - start);
      return `${header}\n\n${numbered}`;
    } catch (err: any) {
      logToolExecution('read', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 2. read_file — compatibility alias with simpler signature
  ToolManager.registerTool({
    name: 'read_file',
    description: 'Read the entire text contents of a file. For large files or pagination, use the "read" tool instead.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the target file.' },
        explicit_permission: { type: 'boolean', description: 'Set to true if user confirmed outside-workspace access.' }
      },
      required: ['path']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);
      if (!fs.existsSync(safePath)) throw new Error(`File does not exist: ${args.path}`);
      const content = fs.readFileSync(safePath, 'utf8');
      logToolExecution('read_file', args, 'success', Date.now() - start);
      return content;
    } catch (err: any) {
      logToolExecution('read_file', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 3. write — Create or overwrite files
  ToolManager.registerTool({
    name: 'write',
    description: 'Create a new file or completely overwrite an existing file with new content. Creates parent directories automatically.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the target file.' },
        content: { type: 'string', description: 'Full content to write to the file.' },
        explicit_permission: { type: 'boolean', description: 'Set to true if user confirmed outside-workspace access.' }
      },
      required: ['path', 'content']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, args.content, 'utf8');
      const lines = args.content.split('\n').length;
      const bytes = Buffer.byteLength(args.content, 'utf8');
      logToolExecution('write', args, 'success', Date.now() - start);
      return `File written: ${args.path} (${lines} lines, ${bytes} bytes)`;
    } catch (err: any) {
      logToolExecution('write', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 4. write_file — compatibility alias
  ToolManager.registerTool({
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the target file.' },
        content: { type: 'string', description: 'Raw content string to write.' },
        explicit_permission: { type: 'boolean', description: 'Set to true if user confirmed outside-workspace access.' }
      },
      required: ['path', 'content']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, args.content, 'utf8');
      logToolExecution('write_file', args, 'success', Date.now() - start);
      return `File written successfully: ${args.path}`;
    } catch (err: any) {
      logToolExecution('write_file', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 5. edit — String-based file editing (find & replace)
  ToolManager.registerTool({
    name: 'edit',
    description: [
      'Exact string-replacement editing for files. Finds oldString and replaces with newString.',
      'REQUIRES reading the file first so oldString exactly matches existing content.',
      'Returns a git-style diff showing what changed.',
      'Use replaceAll=true to replace all occurrences of a pattern.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the target file.' },
        oldString: { type: 'string', description: 'Exact text to find and replace. Must match exactly including whitespace.' },
        newString: { type: 'string', description: 'Replacement text.' },
        replaceAll: { type: 'boolean', description: 'If true, replace all occurrences. Default: false (error if multiple found).' },
        explicit_permission: { type: 'boolean', description: 'Set to true if user confirmed outside-workspace access.' }
      },
      required: ['path', 'oldString', 'newString']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);
      if (!fs.existsSync(safePath)) throw new Error(`File does not exist: ${args.path}`);
      const content = fs.readFileSync(safePath, 'utf8');
      const occurrences = (content.split(args.oldString).length - 1);
      if (occurrences === 0) {
        throw new Error(
          `oldString not found in ${args.path}. ` +
          `Ensure exact character matching including whitespace and newlines. ` +
          `Run read("${args.path}") first to get exact content.`
        );
      }
      if (occurrences > 1 && !args.replaceAll) {
        throw new Error(
          `Found ${occurrences} occurrences of oldString in ${args.path}. ` +
          `Use replaceAll=true to replace all, or make oldString more specific by including more surrounding context.`
        );
      }

      const newContent = args.replaceAll
        ? content.split(args.oldString).join(args.newString)
        : content.replace(args.oldString, args.newString);

      fs.writeFileSync(safePath, newContent, 'utf8');

      // Generate simple diff
      const oldLines = args.oldString.split('\n');
      const newLines = args.newString.split('\n');
      const diffOld = oldLines.map((l: string) => `- ${l}`).join('\n');
      const diffNew = newLines.map((l: string) => `+ ${l}`).join('\n');
      const diff = `--- ${args.path}\n+++ ${args.path}\n${diffOld}\n${diffNew}`;

      logToolExecution('edit', args, 'success', Date.now() - start);
      return `File edited: ${args.path} (${occurrences} replacement${occurrences > 1 ? 's' : ''})\n\nDiff:\n${diff}`;
    } catch (err: any) {
      logToolExecution('edit', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 6. edit_file — compatibility alias
  ToolManager.registerTool({
    name: 'edit_file',
    description: 'Modify specific code segments inside an existing file using search-and-replace blocks.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path of the target file.' },
        targetContent: { type: 'string', description: 'Exact matching text block to replace.' },
        replacementContent: { type: 'string', description: 'New replacement text block.' },
        explicit_permission: { type: 'boolean', description: 'Set to true if user confirmed outside-workspace access.' }
      },
      required: ['path', 'targetContent', 'replacementContent']
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const safePath = getSafePath(args.path, args.explicit_permission);
      if (!fs.existsSync(safePath)) throw new Error(`File does not exist: ${args.path}`);
      const content = fs.readFileSync(safePath, 'utf8');
      if (!content.includes(args.targetContent)) {
        throw new Error('Target content block not found in file. Ensure exact spacing and newline matching.');
      }
      const newContent = content.replace(args.targetContent, args.replacementContent);
      fs.writeFileSync(safePath, newContent, 'utf8');
      logToolExecution('edit_file', args, 'success', Date.now() - start);
      return `File edited successfully: ${args.path}`;
    } catch (err: any) {
      logToolExecution('edit_file', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // 7. list_directory — List files and subfolders with rich metadata
  ToolManager.registerTool({
    name: 'list_directory',
    description: 'List all files and subfolders in a workspace directory with type, size, and modification time.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path of the directory. Defaults to workspace root.' }
      }
    }
  }, async (args) => {
    const start = Date.now();
    try {
      const targetDir = args.path
        ? getSafePath(args.path)
        : stateManager.getState().workspacePath;
      if (!fs.existsSync(targetDir)) throw new Error(`Directory does not exist: ${args.path || '.'}`);
      const items = fs.readdirSync(targetDir);
      const result = items.map(item => {
        const stats = fs.statSync(path.join(targetDir, item));
        return {
          name: item,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString().slice(0, 16)
        };
      });
      logToolExecution('list_directory', args, 'success', Date.now() - start);
      return result;
    } catch (err: any) {
      logToolExecution('list_directory', args, 'failure', Date.now() - start);
      throw err;
    }
  });

  // ─────────────────────────────────────────────────────────
  // 💻 SHELL & EXECUTION
  // ─────────────────────────────────────────────────────────

  // 8. bash — Execute shell commands
  ToolManager.registerTool({
    name: 'bash',
    description: [
      'Execute shell commands in the active workspace.',
      'ALWAYS use non-interactive flags: -y, --yes, -f.',
      'Chain dependent commands with &&.',
      'For long-running processes (servers, watch), use spawn_process instead.',
      'Never use interactive commands: vim, nano, less, more, man, python REPL.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command line to run. Use non-interactive flags.' },
        workdir: { type: 'string', description: 'Optional working directory (relative to workspace). Defaults to workspace root.' },
        timeout: { type: 'number', description: 'Timeout in milliseconds. Default: 30000ms.' }
      },
      required: ['command']
    }
  }, async (args) => {
    const start = Date.now();
    const wsPath = stateManager.getState().workspacePath;
    const cwd = args.workdir ? path.resolve(wsPath, args.workdir) : wsPath;
    const timeout = args.timeout || 30000;
    try {
      const { stdout, stderr } = await asyncExec(args.command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024 * 4 // 4MB
      });
      const output = stdout || stderr || '(Command completed with no stdout output)';
      const result = output.slice(0, 8000);
      logToolExecution('bash', { command: args.command }, 'success', Date.now() - start);
      return result;
    } catch (err: any) {
      const errMsg = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n').slice(0, 4000);
      logToolExecution('bash', { command: args.command }, 'failure', Date.now() - start);
      throw new Error(`Command failed:\n${errMsg}`);
    }
  });

  // 9. git_status
  ToolManager.registerTool({
    name: 'git_status',
    description: 'Query git working tree file change statuses (staged, unstaged, untracked).',
    parameters: { type: 'object', properties: {} }
  }, async () => {
    const wsPath = stateManager.getState().workspacePath;
    try {
      const { stdout } = await asyncExec('git status', { cwd: wsPath });
      return stdout;
    } catch (err: any) {
      if (err.message?.includes('not a git repository')) {
        return 'Not a git repository. Git tracking is not initialized in this workspace.';
      }
      return `Git status failed: ${err.stderr || err.message}`;
    }
  });

  // 10. git_diff
  ToolManager.registerTool({
    name: 'git_diff',
    description: 'Show unstaged git changes as a unified diff.',
    parameters: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'If true, show staged changes (--staged). Default: unstaged.' },
        file: { type: 'string', description: 'Optional: specific file to diff.' }
      }
    }
  }, async (args) => {
    const wsPath = stateManager.getState().workspacePath;
    try {
      const stagedFlag = args.staged ? '--staged' : '';
      const fileFlag = args.file ? `-- "${args.file}"` : '';
      const cmd = `git diff ${stagedFlag} ${fileFlag}`.trim();
      const { stdout } = await asyncExec(cmd, { cwd: wsPath });
      return stdout || '(No differences found)';
    } catch (err: any) {
      if (err.message?.includes('not a git repository')) {
        return 'Not a git repository. Git tracking is not initialized in this workspace.';
      }
      return `Git diff failed: ${err.stderr || err.message}`;
    }
  });

  // ─────────────────────────────────────────────────────────
  // 🌐 WEB
  // ─────────────────────────────────────────────────────────

  // 11. fetch_url_content — fetch web page content
  ToolManager.registerTool({
    name: 'fetch_url_content',
    description: 'Fetch text content from a web URL. Strips scripts/styles and returns readable markdown text. 10k char limit.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The absolute URL to fetch (https://...).' }
      },
      required: ['url']
    }
  }, async (args) => {
    try {
      const response = await fetch(args.url, {
        headers: { 'User-Agent': 'OpenChat-CLI/1.0 (compatible; curl/7.0)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const text = await response.text();
      return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
    } catch (err: any) {
      throw new Error(`Failed to fetch URL: ${err.message}`);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 🔄 BACKGROUND PROCESS MANAGEMENT
  // ─────────────────────────────────────────────────────────

  // 12. spawn_process — Start long-running background processes
  ToolManager.registerTool({
    name: 'spawn_process',
    description: [
      'Start a long-running background process (dev server, python REPL, node REPL, daemon).',
      'Returns a process_id to manage it.',
      'Use read_process to see output, write_process to send stdin, kill_process to stop.'
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to run in background.' }
      },
      required: ['command']
    }
  }, async (args) => {
    const wsPath = stateManager.getState().workspacePath;
    const processId = `pid_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const child = spawn(args.command, [], {
      cwd: wsPath,
      shell: true,
      detached: false
    });

    activeProcesses.set(processId, { process: child, output: '', exitCode: null });

    child.stdout?.on('data', (data: Buffer) => {
      const proc = activeProcesses.get(processId);
      if (proc) proc.output += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      const proc = activeProcesses.get(processId);
      if (proc) proc.output += `[STDERR] ${data.toString()}`;
    });
    child.on('close', (code: number | null) => {
      const proc = activeProcesses.get(processId);
      if (proc) {
        proc.exitCode = code;
        proc.output += `\n[Process exited with code: ${code}]`;
      }
    });
    child.on('error', (err: Error) => {
      const proc = activeProcesses.get(processId);
      if (proc) proc.output += `\n[Process error: ${err.message}]`;
    });

    // Wait briefly to catch immediate errors
    await new Promise(r => setTimeout(r, 300));
    const proc = activeProcesses.get(processId);
    const earlyOutput = proc?.output || '';

    return [
      `Background process spawned successfully.`,
      `Process ID: ${processId}`,
      `Command: ${args.command}`,
      earlyOutput ? `\nInitial output:\n${earlyOutput.slice(0, 500)}` : '',
      `\nUse:  read_process("${processId}")  — to see output`,
      `      write_process("${processId}", "input\\n")  — to send stdin`,
      `      kill_process("${processId}")  — to terminate`
    ].filter(Boolean).join('\n');
  });

  // 13. read_process — Read process stdout/stderr output
  ToolManager.registerTool({
    name: 'read_process',
    description: 'Read the recent console output (stdout/stderr) of a background process. Clears the buffer after reading.',
    parameters: {
      type: 'object',
      properties: {
        process_id: { type: 'string', description: 'Process ID returned by spawn_process.' },
        peek: { type: 'boolean', description: 'If true, return output without clearing the buffer. Default: false (clears buffer).' }
      },
      required: ['process_id']
    }
  }, async (args) => {
    const proc = activeProcesses.get(args.process_id);
    if (!proc) throw new Error(`Process ID not found: ${args.process_id}. It may have been killed or never existed.`);
    const out = proc.output || '[No new output]';
    if (!args.peek) proc.output = ''; // Clear buffer
    const status = proc.exitCode !== null ? `(Exited: code ${proc.exitCode})` : '(Running)';
    return `Process ${args.process_id} ${status}:\n${out}`;
  });

  // 14. write_process — Send stdin input to a process
  ToolManager.registerTool({
    name: 'write_process',
    description: 'Send text to stdin of an interactive background process (e.g., a Python REPL or Node REPL).',
    parameters: {
      type: 'object',
      properties: {
        process_id: { type: 'string', description: 'Process ID returned by spawn_process.' },
        input: { type: 'string', description: 'Text to send to stdin. Include \\n to submit a line/command.' }
      },
      required: ['process_id', 'input']
    }
  }, async (args) => {
    const proc = activeProcesses.get(args.process_id);
    if (!proc) throw new Error(`Process ID not found: ${args.process_id}`);
    if (!proc.process.stdin) throw new Error(`Process ${args.process_id} does not accept stdin.`);
    if (proc.process.stdin.destroyed) throw new Error(`Process ${args.process_id} stdin is closed.`);
    proc.process.stdin.write(args.input);
    return `Input sent to ${args.process_id}. Wait ~500ms then use read_process to see the result.`;
  });

  // 15. kill_process — Terminate a background process
  ToolManager.registerTool({
    name: 'kill_process',
    description: 'Terminate a background process by ID.',
    parameters: {
      type: 'object',
      properties: {
        process_id: { type: 'string', description: 'Process ID to terminate.' },
        signal: { type: 'string', description: 'Signal to send: SIGTERM (default), SIGKILL, SIGINT.' }
      },
      required: ['process_id']
    }
  }, async (args) => {
    const proc = activeProcesses.get(args.process_id);
    if (!proc) throw new Error(`Process ID not found: ${args.process_id}`);
    try {
      proc.process.kill((args.signal as NodeJS.Signals) || 'SIGTERM');
    } catch {}
    activeProcesses.delete(args.process_id);
    return `Process ${args.process_id} terminated with ${args.signal || 'SIGTERM'}.`;
  });

  // 16. list_processes — List all active background processes
  ToolManager.registerTool({
    name: 'list_processes',
    description: 'List all currently active background processes managed by spawn_process.',
    parameters: { type: 'object', properties: {} }
  }, async () => {
    if (activeProcesses.size === 0) return 'No active background processes.';
    const list = Array.from(activeProcesses.entries()).map(([id, p]) => {
      const status = p.exitCode !== null ? `Exited (${p.exitCode})` : 'Running';
      const outBytes = p.output.length;
      return `• ${id}: ${status}, ${outBytes} bytes buffered output`;
    });
    return `Active Processes (${activeProcesses.size}):\n${list.join('\n')}`;
  });

  // ─────────────────────────────────────────────────────────
  // 🧠 MEMORY
  // ─────────────────────────────────────────────────────────

  // 17. search_memory — Search past sessions
  ToolManager.registerTool({
    name: 'search_memory',
    description: 'Search across all past chat sessions to find previous context, instructions, or conversations. Returns matching message excerpts.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Keyword or phrase to search for across all past sessions.' },
        limit: { type: 'number', description: 'Max number of matching messages to return. Default: 20.' }
      },
      required: ['keyword']
    }
  }, async (args) => {
    try {
      const sessionRepo = new SessionRepository();
      const sessions = sessionRepo.listSessions();
      let matchedContext = '';
      let matchCount = 0;
      const maxMatches = args.limit || 20;
      const kw = args.keyword.toLowerCase();

      for (const sess of sessions) {
        if (sess.id === stateManager.getState().activeSessionId) continue;
        const msgs = sessionRepo.getMessages(sess.id);
        const matchedMsgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(kw));

        if (matchedMsgs.length > 0) {
          matchedContext += `\n--- Session: "${sess.title}" (ID: ${sess.id}) ---\n`;
          for (const m of matchedMsgs) {
            if (matchCount >= maxMatches) break;
            const content = m.content || '';
            const idx = content.toLowerCase().indexOf(kw);
            const snippet = content.slice(Math.max(0, idx - 60), idx + 200);
            matchedContext += `[${m.role.toUpperCase()}]: ...${snippet}...\n`;
            matchCount++;
          }
        }
        if (matchCount >= maxMatches) break;
      }

      if (!matchedContext) return `No memories found matching "${args.keyword}".`;
      return `Memory search results for "${args.keyword}" (${matchCount} matches):\n${matchedContext}`;
    } catch (err: any) {
      throw new Error(`Memory search failed: ${err.message}`);
    }
  });

  // Register all extended tools (grep, glob, webfetch, websearch, TypeScript tools, agents, skills, MCP, utilities)
  registerExtendedTools();
  
  // Register all native/built-in emulation tools matching AGY platform specs
  registerNativeTools();
}
