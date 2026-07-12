import { Chalk } from 'chalk';

const c = new Chalk({ level: 3 });

function getVisibleLength(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').length;
}

function padCell(text, width, align) {
  const len = getVisibleLength(text);
  const pad = Math.max(0, width - len);
  if (align === 'right') return ' '.repeat(pad) + text + ' ';
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + text + ' '.repeat(right) + ' ';
  }
  return text + ' '.repeat(pad) + ' ';
}

function transformInline(line) {
  // Inline code: `code`
  return line.replace(/`([^`]+)`/g, (_m, code) =>
    c.hex('#7dcfff')('`') + c.hex('#9ece6a')(code) + c.hex('#7dcfff')('`')
  );
}

function wrapAnsiText(str, maxLength) {
  const ESC = '\u001b';
  const lines = [];
  let currentLine = '';
  let currentVisibleLen = 0;
  
  let i = 0;
  let activeAnsiCodes = [];
  
  const parseAnsiSequence = (index) => {
    let seq = '';
    let j = index;
    if (str[j] === ESC || str[j] === '\x1B') {
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
    if (str[i] === ESC || str[i] === '\x1B') {
      const { seq, nextIndex } = parseAnsiSequence(i);
      currentLine += seq;
      if (seq.includes('[0m') || seq.includes('[m')) {
        activeAnsiCodes = [];
      } else {
        activeAnsiCodes.push(seq);
      }
      i = nextIndex;
    } else if (str[i] === '\n') {
      if (activeAnsiCodes.length > 0) {
        currentLine += '\u001b[0m';
      }
      lines.push(currentLine);
      currentLine = activeAnsiCodes.join('');
      currentVisibleLen = 0;
      i++;
    } else {
      if (currentVisibleLen >= maxLength) {
        const lastSpace = currentLine.lastIndexOf(' ');
        const lastAnsiReset = currentLine.lastIndexOf('\u001b[0m');
        if (lastSpace > lastAnsiReset && (currentLine.length - lastSpace) < 15) {
          const wrapPart = currentLine.slice(lastSpace + 1);
          let prevPart = currentLine.slice(0, lastSpace);
          if (activeAnsiCodes.length > 0) {
            prevPart += '\u001b[0m';
          }
          lines.push(prevPart);
          currentLine = activeAnsiCodes.join('') + wrapPart + str[i];
          currentVisibleLen = getVisibleLength(currentLine);
        } else {
          if (activeAnsiCodes.length > 0) {
            currentLine += '\u001b[0m';
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
    if (activeAnsiCodes.length > 0 && !currentLine.endsWith('\u001b[0m')) {
      currentLine += '\u001b[0m';
    }
    lines.push(currentLine);
  }
  
  return lines;
}

function parseTableRow(line) {
  const trimmed = line.trim().replace(/^\||\|$/g, '');
  const cells = [];
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

function parseAlignments(cells) {
  return cells.map((cell) => {
    const t = cell.trim();
    if (t.startsWith(':') && t.endsWith(':')) return 'center';
    if (t.endsWith(':')) return 'right';
    return 'left';
  });
}

function renderTable(tableLines) {
  if (tableLines.length < 2) {
    return tableLines.map((l) => transformInline(l)).join('\n');
  }

  const headerRow  = parseTableRow(tableLines[0]);
  const alignRow   = parseTableRow(tableLines[1]);
  const dataRows   = tableLines.slice(2).map(parseTableRow);
  const alignments = parseAlignments(alignRow);

  const colCount = headerRow.length;

  const normalize = (row) => {
    const result = [];
    for (let i = 0; i < colCount; i++) {
      result.push(row[i] ?? '');
    }
    return result;
  };

  const normDataRows = dataRows.map(normalize);
  const headerRowTransformed = headerRow.map((cell) => transformInline(cell));
  const normDataRowsTransformed = normDataRows.map((row) =>
    row.map((cell) => transformInline(cell))
  );

  // We set column widths to be proportional or calculate them
  let colWidths = [20, 34]; // hardcoded widths matching the user's template to test

  const activeThemeColors = { primary: '#bb9af7', accent: '#f7768e', textColor: '#a9b1d6', darkMode: true };

  const bord = (s) => c.hex(activeThemeColors.primary)(s);
  const head = (t) => c.hex(activeThemeColors.accent).bold(t);
  const data = (t) => c.hex(activeThemeColors.textColor)(t);

  const topBorder =
    bord('┌') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┬')) +
    bord('┐');

  // Render header row (with wrapping support)
  const headerLines = [];
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

  const sepLine =
    bord('├') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┼')) +
    bord('┤');

  // Render data rows with wrapping
  const dataLines = [];
  const isDark = activeThemeColors.darkMode !== false;
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

  const botBorder =
    bord('└') +
    colWidths.map((w) => bord('─'.repeat(w + 2))).join(bord('┴')) +
    bord('┘');

  return ['', topBorder, ...headerLines, sepLine, ...dataLines, botBorder, ''].join('\n');
}

const sampleMarkdown = `
Section | Description
---|---
16 ta major section | Complete breakdown
\`useInput\` Hook – full explanation | Keno character-by-character paste hoy
`;

console.log("RENDERED OUTPUT:\n", renderTable(sampleMarkdown.trim().split('\n')));
