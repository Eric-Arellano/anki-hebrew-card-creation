const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
};

function decodeEntity(entity: string, name: string): string {
  if (!name.startsWith('#')) return NAMED_ENTITIES[name] ?? entity;
  const codePoint = /^#x/i.test(name)
    ? Number.parseInt(name.slice(2), 16)
    : Number.parseInt(name.slice(1), 10);
  return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
}

/** The text an Anki field shows, from the HTML Anki stores. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .trim();
}
