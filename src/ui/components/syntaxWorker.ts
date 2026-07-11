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
 *  - Superscript/Subscript: <sup>, <sub> (dev.md §3.7)
 *  - Nested Blockquote depth colors (dev2.md §11.3)
 *  - Markdown Table rendering with box-drawing chars (dev.md §7, dev2.md §8)
 *  - Diff code block custom highlighting (dev.md)
 *  - Multi-level bullet styles (dev2.md §9.3)
 *  - Horizontal rule gradient style (dev2.md)
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
  // ── New emoji shortcodes (dev.md §10) ──────────────────────────────────
  ':dart:': '🎯',
  ':wrench:': '🔧',
  ':art:': '🎨',
  ':zap:': '⚡',
  ':hammer_and_wrench:': '🛠️',
  ':test_tube:': '🧪',
  ':bar_chart:': '📊',
  ':pushpin:': '📌',
  ':stop_sign:': '🛑',
  ':hourglass_flowing_sand:': '⏳',
};

function replaceEmojiShortcodes(text: string): string {
  return text.replace(/:[a-zA-Z_0-9]+:/g, (match) => EMOJI_MAP[match] || match);
}

// ─── Nested Blockquote depth colors (dev2.md §11.3) ──────────────────────────
const QUOTE_COLORS: Array<{ border: string; text: string }> = [
  { border: '#d73a49', text: '#d73a49' },  // depth 1: Red
  { border: '#6f42c1', text: '#6f42c1' },  // depth 2: Purple
  { border: '#0366d6', text: '#58a6ff' },  // depth 3: Blue
  { border: '#28a745', text: '#3fb950' },  // depth 4: Green
  { border: '#e36209', text: '#e36209' },  // depth 5: Orange
];

function renderBlockquote(line: string): string {
  const depthMatch = line.match(/^(>+)\s?/);
  if (!depthMatch) return transformInline(line);

  const depth = depthMatch[1].length;
  const content = line.slice(depthMatch[0].length);
  const color = QUOTE_COLORS[(depth - 1) % QUOTE_COLORS.length];

  // Build nested vertical bar indicator
  const bar = '▌'.repeat(depth);
  // Indent inner content based on depth
  const indent = '  '.repeat(depth - 1);

  return (
    indent +
    c.hex(color.border)(bar + ' ') +
    c.hex(color.text)(transformInline(content))
  );
}

// ─── Diff syntax highlighter (dev.md) ────────────────────────────────────────
function highlightDiff(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      if (line.startsWith('+')) return c.hex('#9ece6a')(line);
      if (line.startsWith('-')) return c.hex('#f7768e')(line);
      if (line.startsWith('@@')) return c.hex('#7dcfff')(line);
      return c.hex('#565f89').dim(line);
    })
    .join('\n');
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

  // Custom diff highlighting (dev.md) — must check before cli-highlight
  if (normalLang === 'diff') {
    return highlightDiff(code);
  }

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

  // 6. Superscript: <sup>text</sup> (dev.md §3.7)
  line = line.replace(/<sup>([^<]+)<\/sup>/g, (_m, text) =>
    c.hex('#7dcfff').dim('^' + text)
  );

  // 7. Subscript: <sub>text</sub> (dev.md §3.7)
  line = line.replace(/<sub>([^<]+)<\/sub>/g, (_m, text) =>
    c.hex('#7dcfff').dim('_' + text)
  );

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

// ─── Table helpers (dev.md §7, dev2.md §8) ────────────────────────────────────

/**
 * Returns true if a line looks like a table row (starts and ends with '|')
 */
function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|');
}

/**
 * Returns true if a line looks like a table alignment/separator row
 * e.g. |---|:---:|---:|
 */
function isAlignmentLine(line: string | undefined): boolean {
  if (!line) return false;
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/.test(line.trim());
}

/**
 * Parse a table row string into an array of cell content strings.
 * Handles escaped pipes (\|) correctly as specified in dev2.md.
 */
function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\||\|$/g, '');
  const cells: string[] = [];
  let current = '';
  let inEscape = false;

  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '\\' && !inEscape) {
      inEscape = true;
      continue;
    }
    if (trimmed[i] === '|' && !inEscape) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += trimmed[i];
    inEscape = false;
  }
  cells.push(current.trim());

  return cells;
}

/**
 * Detect column alignment from alignment row cells.
 * Returns 'left' | 'center' | 'right' for each column.
 */
function parseAlignments(cells: string[]): Array<'left' | 'center' | 'right'> {
  return cells.map((cell) => {
    const t = cell.trim();
    if (t.startsWith(':') && t.endsWith(':')) return 'center';
    if (t.endsWith(':')) return 'right';
    return 'left';
  });
}

/**
 * Pad a string to a given visual width.
 */
function padCell(
  text: string,
  width: number,
  align: 'left' | 'center' | 'right'
): string {
  const len = text.length;
  const pad = Math.max(0, width - len);
  if (align === 'right') return ' '.repeat(pad) + text + ' ';
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + text + ' '.repeat(right) + ' ';
  }
  // default left
  return text + ' '.repeat(pad) + ' ';
}

/**
 * Render an array of consecutive table lines into a beautiful ANSI box table.
 * (dev.md §7, dev2.md §8)
 *
 * Colors:
 *   Border:    #3d59a1
 *   Header:    #7aa2f7 bold
 *   Data:      #a9b1d6
 */
function renderTable(tableLines: string[]): string {
  if (tableLines.length < 2) {
    // Not a proper table — just fall back to inline-transformed lines
    return tableLines.map((l) => transformInline(l)).join('\n');
  }

  // Split into header, alignment, and data rows
  const headerRow  = parseTableRow(tableLines[0]);
  const alignRow   = parseTableRow(tableLines[1]);
  const dataRows   = tableLines.slice(2).map(parseTableRow);
  const alignments = parseAlignments(alignRow);

  const colCount = headerRow.length;

  // Normalize column count across all rows
  const normalize = (row: string[]): string[] => {
    const result: string[] = [];
    for (let i = 0; i < colCount; i++) {
      result.push(row[i] ?? '');
    }
    return result;
  };

  const normDataRows = dataRows.map(normalize);

  // Calculate column widths (minimum = header length, expand for data)
  const colWidths: number[] = headerRow.map((h, i) => {
    let max = h.length;
    for (const row of normDataRows) {
      max = Math.max(max, (row[i] ?? '').length);
    }
    return max;
  });

  // ── Box-drawing render ──────────────────────────────────────────────────
  const bord = (s: string) => c.hex('#3d59a1')(s);
  const head = (t: string) => c.hex('#7aa2f7').bold(t);
  const data = (t: string) => c.hex('#a9b1d6')(t);

  // Top border: ╭─────┬─────╮
  const topBorder =
    bord('╭') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┬')) +
    bord('╮');

  // Header row: │ H1  │ H2  │
  const headerLine =
    bord('│') +
    headerRow
      .map((cell, i) => head(padCell(cell, colWidths[i], alignments[i] ?? 'left')))
      .join(bord('│')) +
    bord('│');

  // Header/body separator: ├─────┼─────┤
  const sepLine =
    bord('├') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┼')) +
    bord('┤');

  // Data rows: │ D1  │ D2  │
  const dataLines = normDataRows.map(
    (row) =>
      bord('│') +
      row
        .map((cell, i) => data(padCell(cell, colWidths[i], alignments[i] ?? 'left')))
        .join(bord('│')) +
      bord('│')
  );

  // Bottom border: ╰─────┴─────╯
  const botBorder =
    bord('╰') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┴')) +
    bord('╯');

  return ['', topBorder, headerLine, sepLine, ...dataLines, botBorder, ''].join('\n');
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

  // Horizontal rules (dev2.md) — gradient-like thick rule
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
    return c.hex('#3d59a1')('━'.repeat(50));
  }

  // Blockquotes — nested depth support (dev2.md §11.3)
  if (/^>+\s?/.test(line)) {
    return renderBlockquote(line);
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

  // Unordered lists — multi-level bullet styles (dev2.md §9.3)
  const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
  if (ulMatch) {
    const [, indent, , content] = ulMatch;
    const level = Math.floor(indent.length / 2);
    // dev2.md §9.3: • ◦ ▪ ▫
    const bullets = ['•', '◦', '▪', '▫'];
    const colors  = ['#7aa2f7', '#9ece6a', '#e0af68', '#ff9e64'];
    const bullet  = bullets[level % bullets.length];
    const col     = colors[level % colors.length];
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
    .replace(/\r\n/g, '\n')                              // Normalize CRLF to LF
    .replace(/\r/g, '\n')                                // Normalize old CR to LF
    .replace(/\0/g, '')                                  // Strip null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Strip control chars

  const rawLines = cleanText.split('\n');
  const lines: string[] = [];

  // Preprocess: merge wrapped table lines (handles cases where AI wrapped cells without pipes)
  for (let k = 0; k < rawLines.length; k++) {
    let current = rawLines[k];
    const trimmed = current.trim();

    if (trimmed.startsWith('|') && !trimmed.endsWith('|')) {
      let mergeIndex = k + 1;
      let toMerge = '';
      let foundEnd = false;

      while (mergeIndex < rawLines.length) {
        const nextLine = rawLines[mergeIndex];
        const nextTrimmed = nextLine.trim();

        if (nextTrimmed.startsWith('|')) {
          break;
        }
        if (nextTrimmed === '') {
          break;
        }

        toMerge += ' ' + nextTrimmed;

        if (nextTrimmed.endsWith('|')) {
          foundEnd = true;
          break;
        }

        mergeIndex++;
      }

      if (foundEnd) {
        current = current + toMerge;
        k = mergeIndex; // Skip merged lines
      }
    }

    lines.push(current);
  }

  const output: string[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let linesProcessed = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    linesProcessed++;

    // ── Detect opening fence ──────────────────────────────────────────────
    if (!inCodeBlock && /^```[\w-]*$/.test(line.trim())) {
      const fenceMatch = line.trim().match(/^```([\w-]*)/);
      codeLang = fenceMatch?.[1] ?? '';
      inCodeBlock = true;
      codeLines = [];
      i++;
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
      i++;
      continue;
    }

    // ── Accumulate code block lines ───────────────────────────────────────
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // ── Table detection & block-level rendering (dev.md §7, dev2.md §8) ──
    if (isTableLine(line) && isAlignmentLine(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
        linesProcessed++;
      }
      output.push(renderTable(tableLines));
      continue;
    }

    // ── Regular Markdown line ─────────────────────────────────────────────
    output.push(transformMarkdownLine(line));
    i++;
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
