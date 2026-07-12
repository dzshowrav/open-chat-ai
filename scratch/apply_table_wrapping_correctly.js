import fs from 'fs';

// 1. Update MarkdownWorker.tsx
const markdownWorkerPath = 'src/ui/components/MarkdownWorker.tsx';
let workerContent = fs.readFileSync(markdownWorkerPath, 'utf8');

const targetWorkerSearch = `      const theme = themeManager.getCurrentTheme();
      const themeColors = { primary: theme.primaryColor, accent: theme.accentColor };`;

const targetWorkerReplace = `      const theme = themeManager.getCurrentTheme();
      const themeColors = { 
        primary: theme.primaryColor, 
        accent: theme.accentColor,
        textColor: theme.textColor,
        backgroundColor: theme.backgroundColor,
        darkMode: theme.darkMode
      };`;

if (workerContent.includes(targetWorkerSearch)) {
  workerContent = workerContent.replace(targetWorkerSearch, targetWorkerReplace);
  fs.writeFileSync(markdownWorkerPath, workerContent, 'utf8');
  console.log("Successfully updated MarkdownWorker.tsx!");
} else {
  console.error("MarkdownWorker.tsx search target not found!");
}

// 2. Update syntaxWorker.ts
const syntaxWorkerPath = 'src/ui/components/syntaxWorker.ts';
let syntaxContent = fs.readFileSync(syntaxWorkerPath, 'utf8');

// 2a. Update activeThemeColors initialization
const searchColorsInit = `let activeThemeColors = { primary: '#bb9af7', accent: '#7aa2f7' };`;
const replaceColorsInit = `let activeThemeColors: any = {
  primary: '#bb9af7',
  accent: '#7aa2f7',
  textColor: '#a9b1d6',
  backgroundColor: '#1f2335',
  darkMode: true
};`;

if (syntaxContent.includes(searchColorsInit)) {
  syntaxContent = syntaxContent.replace(searchColorsInit, replaceColorsInit);
  console.log("Updated activeThemeColors initialization.");
} else {
  console.error("activeThemeColors initialization search block not found!");
}

// 2b. Add wrapAnsiText function
const wrapAnsiTextCode = `
/**
 * Wrap a string containing ANSI escape codes into an array of lines,
 * each having a visual width of at most maxLength.
 */
function wrapAnsiText(str: string, maxLength: number): string[] {
  const ESC = '\\u001b';
  const lines: string[] = [];
  let currentLine = '';
  let currentVisibleLen = 0;
  
  let i = 0;
  let activeAnsiCodes: string[] = [];
  
  const parseAnsiSequence = (index: number) => {
    let seq = '';
    let j = index;
    if (str[j] === ESC || str[j] === '\\x1B') {
      while (j < str.length) {
        const char = str[j];
        seq += char;
        j++;
        if (char.match(/[a-zA-Z]/)) {
          break;
        }
      }
    }
    return { seq, nextIndex: j };
  };

  while (i < str.length) {
    if (str[i] === ESC || str[i] === '\\x1B') {
      const { seq, nextIndex } = parseAnsiSequence(i);
      currentLine += seq;
      if (seq.includes('[0m') || seq.includes('[m')) {
        activeAnsiCodes = [];
      } else {
        activeAnsiCodes.push(seq);
      }
      i = nextIndex;
    } else if (str[i] === '\\n') {
      if (activeAnsiCodes.length > 0) {
        currentLine += '\\u001b[0m';
      }
      lines.push(currentLine);
      currentLine = activeAnsiCodes.join('');
      currentVisibleLen = 0;
      i++;
    } else {
      if (currentVisibleLen >= maxLength) {
        const lastSpace = currentLine.lastIndexOf(' ');
        const lastAnsiReset = currentLine.lastIndexOf('\\u001b[0m');
        if (lastSpace > lastAnsiReset && (currentLine.length - lastSpace) < 15) {
          const wrapPart = currentLine.slice(lastSpace + 1);
          let prevPart = currentLine.slice(0, lastSpace);
          if (activeAnsiCodes.length > 0) {
            prevPart += '\\u001b[0m';
          }
          lines.push(prevPart);
          currentLine = activeAnsiCodes.join('') + wrapPart + str[i];
          currentVisibleLen = getVisibleLength(currentLine);
        } else {
          if (activeAnsiCodes.length > 0) {
            currentLine += '\\u001b[0m';
          }
          lines.push(currentLine);
          currentLine = activeAnsiCodes.join('') + str[i];
          currentVisibleLen = 1;
        }
      } else {
        currentLine += str[i];
        currentVisibleLen++;
      }
      i++;
    }
  }
  
  if (currentLine !== '' || lines.length === 0) {
    if (activeAnsiCodes.length > 0 && !currentLine.endsWith('\\u001b[0m')) {
      currentLine += '\\u001b[0m';
    }
    lines.push(currentLine);
  }
  
  return lines;
}
`;

if (!syntaxContent.includes('function wrapAnsiText')) {
  const padCellMarker = 'function padCell(';
  const padCellIndex = syntaxContent.indexOf(padCellMarker);
  if (padCellIndex !== -1) {
    syntaxContent = syntaxContent.slice(0, padCellIndex) + wrapAnsiTextCode + '\n' + syntaxContent.slice(padCellIndex);
    console.log("Inserted wrapAnsiText function into syntaxWorker.ts");
  }
}

// 2c. Replace isTableLine and isAlignmentLine definitions
const searchHelpers = `/**
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
  return /^\\|\\s*:?-+:?\\s*(\\|\\s*:?-+:?\\s*)+\\|$/.test(line.trim());
}`;

const replaceHelpers = `/**
 * Returns true if a line looks like a table row (contains '|')
 */
function isTableLine(line: string | undefined): boolean {
  if (!line) return false;
  return line.includes('|');
}

/**
 * Returns true if a line looks like a table alignment/separator row
 * e.g. |---|:---:|---:| or ---|---
 */
function isAlignmentLine(line: string | undefined): boolean {
  if (!line) return false;
  const t = line.trim();
  if (!t.includes('|')) return false;
  return /^\\|?\\s*:?-+:?\\s*(?:\\|\\s*:?-+:?\\s*)+\\|?$/.test(t);
}`;

if (syntaxContent.includes(searchHelpers)) {
  syntaxContent = syntaxContent.replace(searchHelpers, replaceHelpers);
  console.log("Successfully updated isTableLine and isAlignmentLine definitions.");
} else {
  // Match clean regex version
  const searchHelpersNoEscape = `/**
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
}`;
  if (syntaxContent.includes(searchHelpersNoEscape)) {
    syntaxContent = syntaxContent.replace(searchHelpersNoEscape, replaceHelpers);
    console.log("Successfully updated isTableLine and isAlignmentLine definitions (matched clean version).");
  } else {
    console.error("Helper functions search block not found!");
  }
}

// 2d. Replace the table preprocessor start check in processMarkdown
const searchPrep = `    // Check if a table is starting
    if (!inTable) {
      const nextLine = rawLines[k + 1];
      if (trimmed.startsWith('|') && nextLine && /^\\|\\s*:?-+:?\\s*(\\|\\s*:?-+:?\\s*)+\\|$/.test(nextLine.trim())) {
        inTable = true;
      }
    }

    if (inTable) {
      if (trimmed.startsWith('|')) {
        let row = current;
        if (!trimmed.endsWith('|')) {
          // Merge subsequent lines until we find one that ends with '|' or starts a new block/row
          let mergeIndex = k + 1;
          while (mergeIndex < rawLines.length) {
            const next = rawLines[mergeIndex];
            const nextTrimmed = next.trim();
            if (nextTrimmed.startsWith('|') || nextTrimmed === '' || isNewBlock(nextTrimmed)) {
              break;
            }
            row += ' ' + nextTrimmed;
            k = mergeIndex;
            if (nextTrimmed.endsWith('|')) {
              break;
            }
            mergeIndex++;
          }
        }
        lines.push(row);
      } else {
        // Line doesn't start with '|' but we are in a table block: it's a wrapped line
        if (lines.length > 0) {
          const lastIndex = lines.length - 1;
          lines[lastIndex] = lines[lastIndex] + ' ' + trimmed;
        } else {
          lines.push(current);
        }
      }
    } else {
      lines.push(current);
    }`;

const replacePrep = `    // Check if a table is starting
    if (!inTable) {
      const nextLine = rawLines[k + 1];
      if (trimmed.includes('|') && isAlignmentLine(nextLine)) {
        inTable = true;
      }
    }

    if (inTable) {
      if (trimmed.includes('|')) {
        lines.push(current);
      } else {
        inTable = false;
        lines.push(current);
      }
    } else {
      lines.push(current);
    }`;

if (syntaxContent.includes(searchPrep)) {
  syntaxContent = syntaxContent.replace(searchPrep, replacePrep);
  console.log("Successfully updated table preprocessor check.");
} else {
  // Match clean version
  const searchPrepNoEscape = `    // Check if a table is starting
    if (!inTable) {
      const nextLine = rawLines[k + 1];
      if (trimmed.startsWith('|') && nextLine && /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/.test(nextLine.trim())) {
        inTable = true;
      }
    }

    if (inTable) {
      if (trimmed.startsWith('|')) {
        let row = current;
        if (!trimmed.endsWith('|')) {
          // Merge subsequent lines until we find one that ends with '|' or starts a new block/row
          let mergeIndex = k + 1;
          while (mergeIndex < rawLines.length) {
            const next = rawLines[mergeIndex];
            const nextTrimmed = next.trim();
            if (nextTrimmed.startsWith('|') || nextTrimmed === '' || isNewBlock(nextTrimmed)) {
              break;
            }
            row += ' ' + nextTrimmed;
            k = mergeIndex;
            if (nextTrimmed.endsWith('|')) {
              break;
            }
            mergeIndex++;
          }
        }
        lines.push(row);
      } else {
        // Line doesn't start with '|' but we are in a table block: it's a wrapped line
        if (lines.length > 0) {
          const lastIndex = lines.length - 1;
          lines[lastIndex] = lines[lastIndex] + ' ' + trimmed;
        } else {
          lines.push(current);
        }
      }
    } else {
      lines.push(current);
    }`;
  if (syntaxContent.includes(searchPrepNoEscape)) {
    syntaxContent = syntaxContent.replace(searchPrepNoEscape, replacePrep);
    console.log("Successfully updated table preprocessor check (matched clean version).");
  } else {
    console.error("Table preprocessor check search block not found!");
  }
}

// 2e. Replace the renderTable rendering logic with wrapping support and row separators
const searchTableRender = `  // ── Box-drawing render ──────────────────────────────────────────────────
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
    headerRowTransformed
      .map((cell, i) => {
        const truncated = truncateAnsi(cell, colWidths[i]);
        return head(padCell(truncated, colWidths[i], alignments[i] ?? 'left'));
      })
      .join(bord('│')) +
    bord('│');

  // Header/body separator: ├─────┼─────┤
  const sepLine =
    bord('├') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┼')) +
    bord('┤');

  // Data rows: │ D1  │ D2  │
  const dataLines = normDataRowsTransformed.map((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const cellBg = isEven ? '#1f2335' : '#24283b'; // Tokyo night styled subtle background
    return (
      bord('│') +
      row
        .map((cell, i) => {
          const truncated = truncateAnsi(cell, colWidths[i]);
          const padded = padCell(truncated, colWidths[i], alignments[i] ?? 'left');
          return c.bgHex(cellBg)(data(padded));
        })
        .join(bord('│')) +
      bord('│')
    );
  });

  // Bottom border: ╰─────┴─────╯
  const botBorder =
    bord('╰') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┴')) +
    bord('╯');

  return ['', topBorder, headerLine, sepLine, ...dataLines, botBorder, ''].join('\\n');`;

const replaceTableRender = `  // ── Box-drawing render ──────────────────────────────────────────────────
  const bord = (s: string) => c.hex(activeThemeColors.primary || '#3d59a1')(s);
  const head = (t: string) => c.hex(activeThemeColors.accent || '#7aa2f7').bold(t);
  const data = (t: string) => c.hex((activeThemeColors as any).textColor || '#a9b1d6')(t);

  // Top border: ┌─────┬─────┐
  const topBorder =
    bord('┌') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┬')) +
    bord('┐');

  // Render header row (with wrapping support)
  const headerLines: string[] = [];
  const headerCellLines = headerRowTransformed.map((cell, colIdx) => wrapAnsiText(cell, colWidths[colIdx]));
  const headerHeight = Math.max(...headerCellLines.map((lines) => lines.length));

  for (let h = 0; h < headerHeight; h++) {
    const lineCells = headerCellLines.map((lines, colIdx) => {
      const text = lines[h] ?? '';
      return padCell(text, colWidths[colIdx], alignments[colIdx] ?? 'left');
    });

    const renderedLine =
      bord('│') +
      lineCells
        .map((paddedText) => head(paddedText))
        .join(bord('│')) +
      bord('│');

    headerLines.push(renderedLine);
  }

  // Header/body separator: ├─────┼─────┤
  const sepLine =
    bord('├') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┼')) +
    bord('┤');

  // Render data rows with wrapping
  const dataLines: string[] = [];
  const isDark = (activeThemeColors as any).darkMode !== false;
  normDataRowsTransformed.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const cellBg = isDark
      ? (isEven ? '#1f2335' : '#24283b')
      : (isEven ? '#f3f4f6' : '#f9fafb');

    const cellLines = row.map((cell, colIdx) => wrapAnsiText(cell, colWidths[colIdx]));
    const rowHeight = Math.max(...cellLines.map((lines) => lines.length));

    for (let h = 0; h < rowHeight; h++) {
      const lineCells = cellLines.map((lines, colIdx) => {
        const text = lines[h] ?? '';
        return padCell(text, colWidths[colIdx], alignments[colIdx] ?? 'left');
      });

      const renderedLine =
        bord('│') +
        lineCells
          .map((paddedText) => c.bgHex(cellBg)(data(paddedText)))
          .join(bord('│')) +
        bord('│');

      dataLines.push(renderedLine);
    }
    
    // Draw row separator line between data rows (OpenCode style)
    if (rowIndex < normDataRowsTransformed.length - 1) {
      dataLines.push(sepLine);
    }
  });

  // Bottom border: └─────┴─────┘
  const botBorder =
    bord('└') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┴')) +
    bord('┘');

  return ['', topBorder, ...headerLines, sepLine, ...dataLines, botBorder, ''].join('\\n');`;

if (syntaxContent.includes(searchTableRender)) {
  syntaxContent = syntaxContent.replace(searchTableRender, replaceTableRender);
  console.log("Successfully replaced renderTable function inside syntaxWorker.ts!");
} else {
  const searchTableRenderNoEscape = searchTableRender.replace(/\\\\n/g, '\\n');
  const replaceTableRenderNoEscape = replaceTableRender.replace(/\\\\n/g, '\\n');
  if (syntaxContent.includes(searchTableRenderNoEscape)) {
    syntaxContent = syntaxContent.replace(searchTableRenderNoEscape, replaceTableRenderNoEscape);
    console.log("Successfully replaced renderTable function (matched clean version).");
  } else {
    console.error("renderTable search block not found!");
  }
}

fs.writeFileSync(syntaxWorkerPath, syntaxContent, 'utf8');
console.log("Finished updating syntaxWorker.ts table wrapping!");
