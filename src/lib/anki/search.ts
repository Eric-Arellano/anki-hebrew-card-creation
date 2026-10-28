// Anki's search syntax: https://docs.ankiweb.net/searching.html. Every term we build is quoted,
// so a space or a parenthesis in a field name or a word is text, and inside quotes only these
// four characters are special.
function escapeText(text: string): string {
  return text.replace(/[\\"*_]/g, (char) => `\\${char}`);
}

export function quote(term: string): string {
  return `"${term}"`;
}

export function noteTypeIs(name: string): string {
  return quote(`note:${escapeText(name)}`);
}

/** Notes whose `field` contains `key`, a key from `toKey`. */
export function fieldContainsKey(field: string, key: string): string {
  const pattern = [...key]
    .map((char) => {
      // So `בית ספר` also finds `בית&nbsp;ספר`.
      if (char === ' ') return '*';
      // The field may hold the ASCII `'` or `"` that the key folded into these.
      if (char === '׳' || char === '״') return '_';
      return escapeText(char);
    })
    .join('');
  return quote(`${escapeText(field)}:*${pattern}*`);
}

export function noteIdsAre(noteIds: readonly number[]): string {
  return `nid:${noteIds.join(',')}`;
}
