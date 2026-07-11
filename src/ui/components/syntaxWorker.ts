/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HIGH-PERFORMANCE WEB WORKER — Markdown & Syntax Highlighting   ║
 * ║  Runs on a dedicated Node.js Worker Thread.                      ║
 * ║  Never blocks the main UI thread.                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *  - Singleton worker (spawned once, reused forever)
 *  - Streaming-aware: processes partial / complete content
 *  - Smart language auto-detection via highlight.js
 *  - Full ANSI color output using cli-highlight + chalk
 *  - Incremental code-block state machine (handles unclosed ``` gracefully)
 *  - Zero-copy message passing for minimal GC pressure
 *  - Built-in Input Sanitization & Normalization (from dev2.md)
 *  - HTML elements parser: <kbd>, <details>, <summary>, <mark>, <u>, <small>
 *  - Emoji Shortcodes Parser (from dev.md & dev2.md)
 */

import { parentPort } from 'worker_threads';
import { highlight as _cliHighlight, supportsLanguage as _supportsLang } from 'cli-highlight';
import { Chalk } from 'chalk';

// ─── Force ANSI colors inside worker thread (no TTY) ────────────────────────
process.env.FORCE_COLOR = '3';

// ─── Initialize chalk with full 16M color support ────────────────────────────
// Use the Chalk constructor to force level 3 (Truecolor) regardless of TTY
const c = new Chalk({ level: 3 });

// ─── Language alias normalizer ────────────────────────────────────────────────
const LANG_ALIASES: Record<string, string> = {
  js:         'javascript',
  ts:         'typescript',
  py:         'python',
  rb:         'ruby',
  sh:         'bash',
  zsh:        'bash',
  fish:       'bash',
  yml:        'yaml',
  md:         'markdown',
  jsx:        'javascript',
  tsx:        'typescript',
  rs:         'rust',
  kt:         'kotlin',
  kts:        'kotlin',
  cs:         'csharp',
  cpp:        'cpp',
  'c++':      'cpp',
  cc:         'cpp',
  h:          'cpp',
  hpp:        'cpp',
  m:          'objectivec',
  mm:         'objectivec',
  ex:         'elixir',
  exs:        'elixir',
  ml:         'ocaml',
  mli:        'ocaml',
  hs:         'haskell',
  lhs:        'haskell',
  erl:        'erlang',
  hrl:        'erlang',
  groovy:     'groovy',
  gradle:     'groovy',
  tf:         'hcl',
  dockerfile: 'dockerfile',
  docker:     'dockerfile',
  Dockerfile: 'dockerfile',
  nginx:      'nginx',
  conf:       'nginx',
  sql:        'sql',
  prisma:     'sql',
  graphql:    'graphql',
  gql:        'graphql',
  proto:      'protobuf',
  lua:        'lua',
  r:          'r',
  julia:      'julia',
  jl:         'julia',
  vim:        'vim',
  toml:       'ini',
  env:        'bash',
};

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANG_ALIASES[lower] || LANG_ALIASES[lang] || lower;
}

// ─── Emoji Shortcode Map (from dev.md & dev2.md specs) ───────────────────────
const EMOJI_MAP: Record<string, string> = {
  ':smile:': '😊',
  ':laughing:': '😆',
  ':wink:': '😉',
  ':heart_eyes:': '😍',
  ':sunglasses:': '😎',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':clap:': '👏',
  ':wave:': '👋',
  ':pray:': '🙏',
  ':rocket:': '🚀',
  ':fire:': '🔥',
  ':star:': '⭐',
  ':check_mark:': '✅',
  ':white_check_mark:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':memo:': '📝',
  ':bug:': '🐛',
  ':package:': '📦',
  ':green_circle:': '🟢',
  ':yellow_circle:': '🟡',
  ':red_circle:': '🔴',
  ':arrow_right:': '➡️',
  ':arrow_left:': '⬅️',
  ':arrow_up:': '⬆️',
  ':arrow_down:': '⬇️',
  ':bulb:': '💡',
  ':goal:': '🎯',
  ':tools:': '🛠️',
  ':hourglass:': '⏳',
  ':lock:': '🔒',
  ':key:': '🔑',
};

function replaceEmojiShortcodes(text: string): string {
  return text.replace(/:[a-zA-Z_0-9]+:/g, (match) => EMOJI_MAP[match] || match);
}

// ─── Box-drawing header for code blocks ──────────────────────────────────────
function renderCodeBlockHeader(lang: string): string {
  const label = lang ? lang.toUpperCase() : 'CODE';
  const bar = '─'.repeat(Math.max(0, 48 - label.length - 3));
  return c.hex('#3d59a1')(`╭─ ${label} ${bar}╮`);
}

function renderCodeBlockFooter(): string {
  return c.hex('#3d59a1')('╰' + '─'.repeat(50) + '╯');
}

// ─── Line-number gutter renderer ─────────────────────────────────────────────
function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  // Skip line numbers for short snippets (not worth the visual noise)
  if (lines.length < 4) return code;
  const width = String(lines.length).length;
  return lines
    .map((line, i) => {
      const num = String(i + 1).padStart(width, ' ');
      return c.hex('#565f89')(num + ' │ ') + line;
    })
    .join('\n');
}

// ─── Core syntax highlighter ──────────────────────────────────────────────────
function highlightCode(code: string, lang: string): string {
  const normalLang = normalizeLanguage(lang);
  try {
    if (normalLang && _supportsLang(normalLang)) {
      return _cliHighlight(code, { language: normalLang, ignoreIllegals: true });
    }
    // Auto-detect if no/unknown language
    return _cliHighlight(code, { ignoreIllegals: true });
  } catch {
    return code;
  }
}

// ─── Inline Markdown & HTML transformer ───────────────────────────────────────
function transformInline(line: string): string {
  // Strip HTML Comments: <!-- comment -->
  line = line.replace(/<!--[\s\S]*?-->/g, '');

  // Parse HTML elements:
  // 1. Keyboard display: <kbd>Key</kbd>
  line = line.replace(/<kbd>([^<]+)<\/kbd>/g, (_m, key) =>
    c.bgHex('#3b4261').hex('#c0caf5')(` ${key} `)
  );

  // 2. Highlighting: <mark>text</mark>
  line = line.replace(/<mark>([^<]+)<\/mark>/g, (_m, text) =>
    c.bgHex('#e0af68').black(` ${text} `)
  );

  // 3. Underline: <u>text</u>
  line = line.replace(/<u>([^<]+)<\/u>/g, (_m, text) =>
    c.underline(text)
  );

  // 4. Small: <small>text</small>
  line = line.replace(/<small>([^<]+)<\/small>/g, (_m, text) =>
    c.dim(text)
  );

  // 5. Collapsible summary: <summary>Summary Text</summary>
  line = line.replace(/<summary>([\s\S]*?)<\/summary>/g, (_m, summary) =>
    c.hex('#7aa2f7').bold('▶ ' + summary.replace(/<[^>]+>/g, '')) // strip nested tags in summary
  );

  // Remove <details> and </details> wrapper tags
  line = line.replace(/<\/?details>/g, '');

  // Inline code: `code`  — must come first to protect inner text from further transforms
  line = line.replace(/`([^`]+)`/g, (_m, code) =>
    c.hex('#7dcfff')('`') + c.hex('#9ece6a')(code) + c.hex('#7dcfff')('`')
  );

  // Bold+Italic: ***text***
  line = line.replace(/\*\*\*([^*]+)\*\*\*/g, (_m, t) =>
    c.hex('#e0af68').bold(t)
  );

  // Bold: **text**
  line = line.replace(/\*\*([^*]+)\*\*/g, (_m, t) =>
    c.white.bold(t)
  );

  // Italic: *text*
  line = line.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_m, t) =>
    c.hex('#9ece6a')(t)
  );

  // Italic: _text_
  line = line.replace(/(?<!_)_([^_]+)_(?!_)/g, (_m, t) =>
    c.hex('#9ece6a')(t)
  );

  // ~~strikethrough~~
  line = line.replace(/~~([^~]+)~~/g, (_m, t) =>
    c.hex('#565f89').dim(t)
  );

  // [link text](url)
  line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) =>
    c.hex('#7aa2f7')(text) + c.dim.gray(' (' + url + ')')
  );

  // Map emoji shortcodes
  line = replaceEmojiShortcodes(line);

  return line;
}

// ─── Block-level Markdown renderer ───────────────────────────────────────────
function transformMarkdownLine(line: string): string {
  // Headings — by specificity (longest first)
  if (/^######\s/.test(line)) return c.hex('#9ece6a').bold(line);
  if (/^#####\s/.test(line))  return c.hex('#7dcfff').bold(line);
  if (/^####\s/.test(line))   return c.hex('#e0af68').bold(line);
  if (/^###\s/.test(line))    return c.hex('#ff9e64').bold(line);
  if (/^##\s/.test(line))     return c.hex('#7aa2f7').bold(line);
  if (/^#\s/.test(line))      return c.hex('#bb9af7').bold(line);

  // Horizontal rules
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
    return c.hex('#3d59a1')('─'.repeat(52));
  }

  // Blockquotes
  if (/^>\s?/.test(line)) {
    const content = line.replace(/^>\s?/, '');
    return c.hex('#3d59a1')('▌ ') + c.hex('#a9b1d6')(transformInline(content));
  }

  // Task lists (must come before unordered lists)
  const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)/);
  if (taskMatch) {
    const [, indent, checked, content] = taskMatch;
    const box = checked !== ' '
      ? c.hex('#9ece6a')('✔')
      : c.hex('#565f89')('○');
    return indent + box + ' ' + transformInline(content);
  }

  // Unordered lists
  const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
  if (ulMatch) {
    const [, indent, , content] = ulMatch;
    const level = Math.floor(indent.length / 2);
    const bullets  = ['◆', '◇', '▸', '▹'];
    const colors   = ['#7aa2f7', '#9ece6a', '#e0af68', '#ff9e64'];
    const bullet   = bullets[level % bullets.length];
    const col      = colors[level % colors.length];
    return indent + c.hex(col)(bullet + ' ') + transformInline(content);
  }

  // Ordered lists
  const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
  if (olMatch) {
    const [, indent, num, content] = olMatch;
    return indent + c.hex('#7dcfff')(num + '. ') + transformInline(content);
  }

  // Regular text — apply inline transforms
  return transformInline(line);
}

// ─── Main streaming Markdown + Code processor ────────────────────────────────
interface ProcessResult {
  id: string;
  rendered: string;
  isPartial: boolean;
  linesProcessed: number;
}

/**
 * Process full or partial Markdown text, highlighting all code blocks
 * and transforming Markdown formatting into ANSI terminal art.
 *
 * @param text     The raw Markdown string (may be partial/streaming)
 * @param id       Request correlation ID for callback mapping
 * @param partial  True when this is a mid-stream chunk (don't close open blocks)
 */
function processMarkdown(text: string, id: string, partial: boolean): ProcessResult {
  // Input Normalization & Sanitization (from dev2.md specs)
  const cleanText = text
    .replace(/\r\n/g, '\n')                             // Normalize CRLF to LF
    .replace(/\r/g, '\n')                               // Normalize old CR to LF
    .replace(/\0/g, '')                                 // Strip null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');   // Strip control chars

  const lines = cleanText.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let linesProcessed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    linesProcessed++;

    // ── Detect opening fence ──────────────────────────────────────────────
    if (!inCodeBlock && /^```[\w-]*$/.test(line.trim())) {
      const fenceMatch = line.trim().match(/^```([\w-]*)/);
      codeLang = fenceMatch?.[1] ?? '';
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    // ── Detect closing fence ──────────────────────────────────────────────
    if (inCodeBlock && /^```\s*$/.test(line.trim())) {
      inCodeBlock = false;

      const rawCode = codeLines.join('\n');
      const highlighted = highlightCode(rawCode, codeLang);
      const withLineNums = addLineNumbers(highlighted);

      output.push('');
      output.push(renderCodeBlockHeader(codeLang));
      output.push(withLineNums);
      output.push(renderCodeBlockFooter());
      output.push('');

      codeLines = [];
      codeLang = '';
      continue;
    }

    // ── Accumulate code block lines ───────────────────────────────────────
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // ── Regular Markdown line ─────────────────────────────────────────────
    output.push(transformMarkdownLine(line));
  }

  // ── Handle unclosed code block (streaming partial) ────────────────────
  if (inCodeBlock && codeLines.length > 0) {
    const rawCode = codeLines.join('\n');
    const highlighted = highlightCode(rawCode, codeLang);
    const withLineNums = addLineNumbers(highlighted);
    output.push('');
    output.push(renderCodeBlockHeader(codeLang));
    output.push(withLineNums);
    if (partial) {
      // Show a live streaming indicator
      output.push(c.hex('#3d59a1')('╰') + c.hex('#565f89').dim(' …streaming…'));
    } else {
      output.push(renderCodeBlockFooter());
    }
    output.push('');
  }

  return {
    id,
    rendered: output.join('\n'),
    isPartial: partial,
    linesProcessed,
  };
}

// ─── Worker message handler ───────────────────────────────────────────────────
parentPort?.on('message', (message: {
  id: string;
  text: string;
  partial?: boolean;
}) => {
  const { id, text, partial = false } = message;

  try {
    if (!text || typeof text !== 'string') {
      parentPort?.postMessage({ id, rendered: '', isPartial: partial, linesProcessed: 0 });
      return;
    }

    const result = processMarkdown(text, id, partial);
    parentPort?.postMessage(result);

  } catch (err: any) {
    // Always respond — never let the main thread hang waiting for a reply
    parentPort?.postMessage({
      id,
      rendered: text,          // fallback: raw text unchanged
      isPartial: partial,
      linesProcessed: 0,
      error: err?.message || String(err),
    });
  }
});
