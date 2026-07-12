import fs from 'fs';

const filePath = 'src/ui/components/syntaxWorker.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The new table rendering code
const searchTarget = `  // ── Box-drawing render ──────────────────────────────────────────────────
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
    bord('╯');`;

const replacement = `  // ── Box-drawing render ──────────────────────────────────────────────────
  const bord = (s: string) => c.hex(activeThemeColors.primary || '#3d59a1')(s);
  const head = (t: string) => c.hex(activeThemeColors.accent || '#7aa2f7').bold(t);
  const data = (t: string) => c.hex((activeThemeColors as any).textColor || '#a9b1d6')(t);

  // Top border: ┌─────┬─────┐
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
    bord('┘');`;

if (content.includes(searchTarget)) {
  content = content.replace(searchTarget, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully updated syntaxWorker.ts table renderer!");
} else {
  console.error("Search target in syntaxWorker.ts not found! Double check whitespace.");
  // Let's print out lines around the target to debug if it fails
  const index = content.indexOf("const bord = (s: string) => c.hex('#3d59a1')(s);");
  if (index !== -1) {
    console.log("Found closest match at index:", index);
    console.log("Context:\n", content.slice(index - 100, index + 300));
  } else {
    console.log("Could not even find the 'const bord' declaration!");
  }
  process.exit(1);
}
