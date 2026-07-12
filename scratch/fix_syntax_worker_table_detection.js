import fs from 'fs';

const filePath = 'src/ui/components/syntaxWorker.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace isTableLine and isAlignmentLine definitions
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

if (content.includes(searchHelpers)) {
  content = content.replace(searchHelpers, replaceHelpers);
  console.log("Successfully updated isTableLine and isAlignmentLine definitions.");
} else {
  // Try matching without double escaped backslashes for JS strings
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
  if (content.includes(searchHelpersNoEscape)) {
    content = content.replace(searchHelpersNoEscape, replaceHelpers);
    console.log("Successfully updated isTableLine and isAlignmentLine definitions (matched clean regex).");
  } else {
    console.error("Helper functions search block not found!");
  }
}

// 2. Replace the table preprocessor start check in processMarkdown
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

if (content.includes(searchPrep)) {
  content = content.replace(searchPrep, replacePrep);
  console.log("Successfully updated table preprocessor check.");
} else {
  // Try clean version
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
  if (content.includes(searchPrepNoEscape)) {
    content = content.replace(searchPrepNoEscape, replacePrep);
    console.log("Successfully updated table preprocessor check (matched clean version).");
  } else {
    console.error("Table preprocessor check search block not found!");
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Finished updating syntaxWorker.ts table detection helpers!");
