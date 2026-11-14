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

// Without a wildcard, Anki matches the whole field, so a root never finds a longer one.
export function searchByFieldEquals(fieldName: string, text: string): string {
  return quoteSearchTerm(`${escapeInsideQuotedTerm(fieldName)}:${escapeInsideQuotedTerm(text)}`);
}

// A regular expression, which Anki matches without regard to case. Inside quotes Anki passes a
// backslash escape on to the regex untouched, except `\"`, which it reads as a quote. Words may be
// apart by `&nbsp;` in a field's HTML, as typed in Anki.
export function searchByFieldHavingPhrase(fieldName: string, phrase: string): string {
  const pattern = phrase
    .split(/\s+/)
    .map((word) => word.replace(/[\\^$.*+?()[\]{}|"]/g, '\\$&'))
    .join(String.raw`(\s|&nbsp;)+`);
  return quoteSearchTerm(`${escapeInsideQuotedTerm(fieldName)}:re:\\b${pattern}\\b`);
}

/** Notes any of `terms` finds. One term needs no grouping, which keeps the common query plain. */
export function searchForAny(terms: readonly string[]): string {
  return terms.length === 1 ? (terms[0] ?? '') : `(${terms.join(' OR ')})`;
}

export function searchByNoteIds(noteIds: readonly number[]): string {
  return `nid:${noteIds.join(',')}`;
}
