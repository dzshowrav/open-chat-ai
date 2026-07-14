import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { themeManager } from '../theme/themeManager.js';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Myers Diff Algorithm — O(ND) LCS-based line-by-line diff
// ─────────────────────────────────────────────────────────────────────────────

type DiffOp = { type: 'equal' | 'delete' | 'insert'; line: string };

function computeDiff(oldLines: string[], newLines: string[]): DiffOp[] {
  const N = oldLines.length;
  const M = newLines.length;
  const MAX = N + M;

  if (MAX === 0) return [];

  // BFS frontier approach — tracks edit paths
  const trace: Map<number, number>[] = [];
  const V: Map<number, number> = new Map([[1, 0]]);

  let found = false;
  outer: for (let d = 0; d <= MAX; d++) {
    const snap = new Map(V);
    trace.push(snap);
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      const kMinus = V.get(k - 1) ?? -1;
      const kPlus = V.get(k + 1) ?? -1;
      if (k === -d || (k !== d && kMinus < kPlus)) {
        x = kPlus;
      } else {
        x = kMinus + 1;
      }
      let y = x - k;
      // Follow diagonal (equals)
      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      V.set(k, x);
      if (x >= N && y >= M) {
        found = true;
        break outer;
      }
    }
  }

  if (!found) {
    // Fallback: mark all as delete then insert
    return [
      ...oldLines.map(l => ({ type: 'delete' as const, line: l })),
      ...newLines.map(l => ({ type: 'insert' as const, line: l })),
    ];
  }

  // Backtrack through trace to recover edit script
  const ops: DiffOp[] = [];
  let x = N;
  let y = M;

  for (let d = trace.length - 1; d >= 0; d--) {
    const snap = trace[d];
    const k = x - y;
    let prevK: number;
    const kMinus = snap.get(k - 1) ?? -1;
    const kPlus = snap.get(k + 1) ?? -1;
    if (k === -d || (k !== d && kMinus < kPlus)) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = snap.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    // Diagonal (equal) moves
    let cx = x;
    let cy = y;
    while (cx > prevX + 1 && cy > prevY + 1 && oldLines[cx - 1] === newLines[cy - 1]) {
      ops.unshift({ type: 'equal', line: oldLines[cx - 1] });
      cx--;
      cy--;
    }

    if (d > 0) {
      if (cx > prevX) {
        ops.unshift({ type: 'delete', line: oldLines[cx - 1] });
      } else if (cy > prevY) {
        ops.unshift({ type: 'insert', line: newLines[cy - 1] });
      }
    }
    x = prevX;
    y = prevY;
  }

  return ops;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context grouping — collapse unchanged runs into hunks
// ─────────────────────────────────────────────────────────────────────────────

type HunkLine = {
  op: 'equal' | 'delete' | 'insert';
  line: string;
  oldLineNum?: number;
  newLineNum?: number;
};

type Hunk = { lines: HunkLine[]; skipped?: number };

const CONTEXT = 3; // lines of context around each change

function buildHunks(ops: DiffOp[]): Hunk[] {
  // Assign line numbers
  const numbered: HunkLine[] = [];
  let oldN = 1, newN = 1;
  for (const op of ops) {
    numbered.push({
      op: op.type,
      line: op.line,
      oldLineNum: op.type !== 'insert' ? oldN : undefined,
      newLineNum: op.type !== 'delete' ? newN : undefined,
    });
    if (op.type !== 'insert') oldN++;
    if (op.type !== 'delete') newN++;
  }

  // Find indices of changed lines
  const changedIdx = new Set<number>();
  numbered.forEach((l, i) => { if (l.op !== 'equal') changedIdx.add(i); });

  if (changedIdx.size === 0) return []; // no changes

  // Build windows around changes
  const visible = new Set<number>();
  changedIdx.forEach(i => {
    for (let j = Math.max(0, i - CONTEXT); j <= Math.min(numbered.length - 1, i + CONTEXT); j++) {
      visible.add(j);
    }
  });

  const hunks: Hunk[] = [];
  let currentHunk: HunkLine[] = [];
  let lastVisible: number | null = null;

  for (let i = 0; i < numbered.length; i++) {
    if (visible.has(i)) {
      if (lastVisible !== null && i > lastVisible + 1) {
        // Gap between hunks — flush current, record skip
        if (currentHunk.length > 0) {
          hunks.push({ lines: currentHunk });
          currentHunk = [];
        }
        hunks.push({ lines: [], skipped: i - lastVisible - 1 });
      }
      currentHunk.push(numbered[i]);
      lastVisible = i;
    }
  }
  if (currentHunk.length > 0) hunks.push({ lines: currentHunk });

  return hunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Language detection from file extension
// ─────────────────────────────────────────────────────────────────────────────

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
    cs: 'C#', cpp: 'C++', c: 'C', swift: 'Swift', kt: 'Kotlin',
    php: 'PHP', sh: 'Shell', bash: 'Bash', zsh: 'Zsh',
    json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
    md: 'Markdown', html: 'HTML', css: 'CSS', scss: 'SCSS',
    sql: 'SQL', xml: 'XML', dockerfile: 'Dockerfile',
  };
  return map[ext] || ext.toUpperCase() || 'Text';
}

// ─────────────────────────────────────────────────────────────────────────────
// Color utilities for diff lines
// ─────────────────────────────────────────────────────────────────────────────

function getLineColor(op: HunkLine['op']): string {
  if (op === 'delete') return '#ff6b6b';
  if (op === 'insert') return '#51cf66';
  return '#718096';
}

function getLinePrefix(op: HunkLine['op']): string {
  if (op === 'delete') return '─';
  if (op === 'insert') return '+';
  return ' ';
}

// ─────────────────────────────────────────────────────────────────────────────
// DiffCard Props
// ─────────────────────────────────────────────────────────────────────────────

interface DiffCardProps {
  path: string;
  targetContent: string;
  replacementContent: string;
  // For write_file / write tools (full file creation)
  isNewFile?: boolean;
  // Optional: called when user toggles expand
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DiffCard Component
// ─────────────────────────────────────────────────────────────────────────────

export const DiffCard: React.FC<DiffCardProps> = ({
  path: filePath,
  targetContent,
  replacementContent,
  isNewFile = false,
  isActive: _isActive = false,
}) => {
  const theme = themeManager.getCurrentTheme();
  const [expanded, _setExpanded] = useState(true);

  // Parse diff
  const oldLines = (targetContent || '').split('\n');
  const newLines = (replacementContent || '').split('\n');

  let hunks: Hunk[];
  if (isNewFile) {
    // Full file creation — show all lines as inserts
    hunks = [{
      lines: newLines.map((line, i) => ({
        op: 'insert' as const,
        line,
        newLineNum: i + 1,
      }))
    }];
  } else {
    const ops = computeDiff(oldLines, newLines);
    hunks = buildHunks(ops);
  }

  // Compute stats
  const addedCount = hunks.flatMap(h => h.lines).filter(l => l.op === 'insert').length;
  const removedCount = hunks.flatMap(h => h.lines).filter(l => l.op === 'delete').length;
  const totalChangedLines = addedCount + removedCount;

  const lang = detectLanguage(filePath);
  const fileName = path.basename(filePath);
  const dirPart = path.dirname(filePath);
  const shortDir = dirPart === '.' ? '' : dirPart.length > 30
    ? '...' + dirPart.slice(-27)
    : dirPart + '/';

  const allDiffLines = hunks.flatMap(h => h.lines);

  const lineNumWidth = Math.max(
    ...allDiffLines.map(l => Math.max(l.oldLineNum ?? 0, l.newLineNum ?? 0))
  ).toString().length || 1;

  return (
    <Box flexDirection="column" marginY={0.5}>
      {/* ── Header Bar ── */}
      <Box
        flexDirection="row"
        borderStyle="single"
        borderColor={isNewFile ? '#51cf66' : '#4fc3f7'}
        paddingX={1}
        paddingY={0}
      >
        {/* File icon + lang badge */}
        <Box marginRight={1}>
          <Text color={isNewFile ? '#51cf66' : '#4fc3f7'} bold>
            {isNewFile ? '\u{F067} ' : '\u{F0F6} '}
          </Text>
        </Box>

        {/* Path display */}
        <Box flexGrow={1} flexDirection="row">
          <Text color="gray">{shortDir}</Text>
          <Text color={theme.primaryColor} bold>{fileName}</Text>
        </Box>

        {/* Language badge */}
        <Box marginLeft={1}>
          <Text color="#818cf8" bold> {lang} </Text>
        </Box>

        {/* Change stats */}
        <Box marginLeft={1} flexDirection="row">
          {addedCount > 0 && (
            <Text color="#51cf66" bold>+{addedCount} </Text>
          )}
          {removedCount > 0 && (
            <Text color="#ff6b6b" bold>-{removedCount}</Text>
          )}
          {totalChangedLines === 0 && (
            <Text color="#6b7280">no changes</Text>
          )}
        </Box>

        {/* Expand/collapse toggle */}
        <Box marginLeft={2}>
          <Text color="#6b7280">
            {expanded ? '▾ collapse' : '▸ expand'}
          </Text>
        </Box>

        {/* New file badge */}
        {isNewFile && (
          <Box marginLeft={1}>
            <Text color="#51cf66" bold> NEW </Text>
          </Box>
        )}
      </Box>

      {/* ── Diff Hunks ── */}
      {expanded && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderTop={false}
          borderColor="#2d3748"
          paddingX={0}
        >
          {hunks.length === 0 ? (
            <Box paddingX={2} paddingY={0}>
              <Text color="#6b7280" italic>  No visible changes in this hunk context.</Text>
            </Box>
          ) : (
            hunks.map((hunk, hIdx) => (
              <Box key={`hunk_${hIdx}`} flexDirection="column">
                {/* Skipped lines separator */}
                {hunk.skipped && hunk.skipped > 0 && (
                  <Box paddingX={1} paddingY={0}>
                    <Text color="#4a5568" bold>
                      {'·'.repeat(Math.min(lineNumWidth * 2 + 4, 8))} {hunk.skipped} unchanged line{hunk.skipped !== 1 ? 's' : ''} hidden {'·'.repeat(Math.min(lineNumWidth * 2 + 4, 8))}
                    </Text>
                  </Box>
                )}

                {/* Diff lines */}
                {hunk.lines.map((l, lIdx) => {
                  const prefix = getLinePrefix(l.op);
                  const color = getLineColor(l.op);
                  const oldNum = l.oldLineNum != null
                    ? String(l.oldLineNum).padStart(lineNumWidth, ' ')
                    : ' '.repeat(lineNumWidth);
                  const newNum = l.newLineNum != null
                    ? String(l.newLineNum).padStart(lineNumWidth, ' ')
                    : ' '.repeat(lineNumWidth);

                  return (
                    <Box key={`line_${hIdx}_${lIdx}`} flexDirection="row">
                      {/* Old line number gutter */}
                      <Box width={lineNumWidth + 1}>
                        <Text color={l.op === 'delete' ? '#ff6b6b' : '#4a5568'}>
                          {oldNum}
                        </Text>
                      </Box>

                      {/* New line number gutter */}
                      <Box width={lineNumWidth + 2}>
                        <Text color={l.op === 'insert' ? '#51cf66' : '#4a5568'}>
                          {newNum}
                        </Text>
                      </Box>

                      {/* Change prefix */}
                      <Box width={2}>
                        <Text color={color} bold>
                          {prefix}
                        </Text>
                      </Box>

                      {/* Line content */}
                      <Box flexGrow={1}>
                        <Text
                          color={color}
                          bold={l.op !== 'equal'}
                        >
                          {l.line}
                        </Text>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))
          )}
        </Box>
      )}

      {/* ── Collapsed Summary ── */}
      {!expanded && (
        <Box
          flexDirection="row"
          borderStyle="single"
          borderTop={false}
          borderColor="#2d3748"
          paddingX={2}
          paddingY={0}
        >
          <Text color="#6b7280" italic>
            {totalChangedLines} line{totalChangedLines !== 1 ? 's' : ''} changed · press e to expand
          </Text>
        </Box>
      )}

      {/* ── Footer stat bar ── */}
      <Box flexDirection="row" paddingX={1} paddingY={0}>
        <Text color="#4a5568">
          ─── patch applied
        </Text>
        {addedCount > 0 && (
          <>
            <Text color="#4a5568">  </Text>
            <Text color="#065f46">{'█'.repeat(Math.min(addedCount, 20))}</Text>
          </>
        )}
        {removedCount > 0 && (
          <>
            <Text color="#4a5568">  </Text>
            <Text color="#7f1d1d">{'█'.repeat(Math.min(removedCount, 20))}</Text>
          </>
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WriteFileCard — for full file writes (no old content to diff against)
// ─────────────────────────────────────────────────────────────────────────────

interface WriteFileCardProps {
  path: string;
  content: string;
  isNew?: boolean;
}

export const WriteFileCard: React.FC<WriteFileCardProps> = ({ path: filePath, content, isNew = true }) => {
  return (
    <DiffCard
      path={filePath}
      targetContent=""
      replacementContent={content}
      isNewFile={isNew}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EditCard — for the `edit` tool (oldString / newString)
// ─────────────────────────────────────────────────────────────────────────────

interface EditCardProps {
  path: string;
  oldString: string;
  newString: string;
}

export const EditCard: React.FC<EditCardProps> = ({ path: filePath, oldString, newString }) => {
  return (
    <DiffCard
      path={filePath}
      targetContent={oldString}
      replacementContent={newString}
      isNewFile={false}
    />
  );
};
