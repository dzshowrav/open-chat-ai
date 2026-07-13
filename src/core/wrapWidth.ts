import wrapAnsi from 'wrap-ansi';

/**
 * Represents a visual (wrapped) row within a logical line.
 * `start` is the character offset into the original text where this row begins.
 * `length` is the number of characters in this visual row.
 */
export interface VisualRow {
  start: number;
  length: number;
}

/**
 * Compute visual row boundaries for a line of text, matching exactly how Ink's
 * `<Text wrap="wrap">` renders it — using `wrap-ansi` with `{ hard: true, trim: false }`.
 *
 * This replaces the naive `Math.floor(pos / wrapWidth)` model which assumes
 * every row is exactly `wrapWidth` characters wide. In reality, `wrap-ansi`
 * breaks at word boundaries, so rows can have varying lengths.
 *
 * Returns an array of rows with their start offsets and lengths within the
 * original (unwrapped) text.
 */
export function getVisualRows(text: string, wrapWidth: number): VisualRow[] {
  if (!text || wrapWidth <= 0) {
    return [{ start: 0, length: 0 }];
  }

  const wrapped = wrapAnsi(text, wrapWidth, { trim: false, hard: true });
  const rowTexts = wrapped.split('\n');

  const rows: VisualRow[] = [];
  let offset = 0;
  for (const rowText of rowTexts) {
    rows.push({ start: offset, length: rowText.length });
    offset += rowText.length;
  }

  return rows;
}

/**
 * Given a position within a line of text and the visual row info,
 * find which visual row the position belongs to and its column within that row.
 */
export function getVisualPosition(
  posInLine: number,
  rows: VisualRow[],
): { row: number; col: number } {
  if (rows.length === 0) return { row: 0, col: 0 };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (posInLine >= r.start && posInLine < r.start + r.length) {
      return { row: i, col: posInLine - r.start };
    }
  }

  // Past end — place at end of last row
  const last = rows[rows.length - 1];
  return { row: rows.length - 1, col: last.length };
}
