const LEADING_NUMBER_PATTERN = /^\s*\d+[.)\-:]?\s+/;
const LEADING_BULLET_PATTERN = /^\s*[-*•]\s+/;

/**
 * Splits pasted text into clean movie titles: strips numbered-list prefixes
 * ("1. ", "2) "), bullet markers, blank lines, and duplicate whitespace.
 */
export function parseBulkTitles(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_NUMBER_PATTERN, "").replace(LEADING_BULLET_PATTERN, ""))
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0);
}
