// Anki's search syntax: https://docs.ankiweb.net/searching.html. Every term we build is quoted,
// so a space or a parenthesis in a field name or a word is text, and inside quotes only these
// four characters are special.
function escapeInsideQuotedTerm(text: string): string {
  return text.replace(/[\\"*_]/g, (specialChar) => `\\${specialChar}`);
}

export function quoteSearchTerm(term: string): string {
  return `"${term}"`;
}

export function searchByNoteType(noteTypeName: string): string {
  return quoteSearchTerm(`note:${escapeInsideQuotedTerm(noteTypeName)}`);
}

/** Notes whose `fieldName` contains `comparisonKey`, a key from `toComparisonKey`. */
export function searchByFieldContainingKey(fieldName: string, comparisonKey: string): string {
  const wildcardPattern = [...comparisonKey]
    .map((char) => {
      // So `בית ספר` also finds `בית&nbsp;ספר`.
      if (char === ' ') return '*';
      // The field may hold the ASCII `'` or `"` that the key folded into these.
      if (char === '׳' || char === '״') return '_';
      return escapeInsideQuotedTerm(char);
    })
    .join('');
  return quoteSearchTerm(`${escapeInsideQuotedTerm(fieldName)}:*${wildcardPattern}*`);
}

export function searchByNoteIds(noteIds: readonly number[]): string {
  return `nid:${noteIds.join(',')}`;
}
