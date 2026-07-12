import fs from 'fs';

const filePath = 'src/ui/components/syntaxWorker.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add wrapAnsiText below truncateAnsi function
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

// Insert wrapAnsiText code if not already present
if (!content.includes('function wrapAnsiText')) {
  const padCellMarker = 'function padCell(';
  const padCellIndex = content.indexOf(padCellMarker);
  if (padCellIndex !== -1) {
    content = content.slice(0, padCellIndex) + wrapAnsiTextCode + '\n' + content.slice(padCellIndex);
    console.log("Inserted wrapAnsiText function into syntaxWorker.ts");
  }
}

// 2. Replace the renderTable rendering logic with wrapping support and row separators
const searchTableRender = `  // Top border: ┌─────┬─────┐
  const topBorder =
    bord('┌') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┬')) +
    bord('┐');

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
  const isDark = (activeThemeColors as any).darkMode !== false;
  const dataLines = normDataRowsTransformed.map((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const cellBg = isDark
      ? (isEven ? '#1f2335' : '#24283b')
      : (isEven ? '#f3f4f6' : '#f9fafb');
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

  // Bottom border: └─────┴─────┘
  const botBorder =
    bord('└') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┴')) +
    bord('┘');

  return ['', topBorder, headerLine, sepLine, ...dataLines, botBorder, ''].join('\\n');`;

const replaceTableRender = `  // Top border: ┌─────┬─────┐
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

if (content.includes(searchTableRender)) {
  content = content.replace(searchTableRender, replaceTableRender);
  console.log("Successfully replaced renderTable function inside syntaxWorker.ts!");
} else {
  // Let's check with standard single escape newlines
  const searchTableRenderNoEscape = searchTableRender.replace(/\\\\n/g, '\\n');
  const replaceTableRenderNoEscape = replaceTableRender.replace(/\\\\n/g, '\\n');
  if (content.includes(searchTableRenderNoEscape)) {
    content = content.replace(searchTableRenderNoEscape, replaceTableRenderNoEscape);
    console.log("Successfully replaced renderTable function (matched clean version).");
  } else {
    console.error("renderTable search block not found!");
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Finished updating syntaxWorker.ts table wrapping!");
