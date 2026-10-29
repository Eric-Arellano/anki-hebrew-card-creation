// A Map, not an object literal, so `&constructor;` can't find something on the prototype.
const CHAR_BY_NAMED_ENTITY = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
]);

/** `entityBody` is what sits between `&` and `;`: a name, `#123` or `#x7B`. */
function decodeHtmlEntity(wholeEntity: string, entityBody: string): string {
  if (!entityBody.startsWith('#')) return CHAR_BY_NAMED_ENTITY.get(entityBody) ?? wholeEntity;
  const codePoint = /^#x/i.test(entityBody)
    ? Number.parseInt(entityBody.slice(2), 16)
    : Number.parseInt(entityBody.slice(1), 10);
  return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : wholeEntity;
}

/** The text an Anki field shows, from the HTML Anki stores. */
export function ankiFieldHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeHtmlEntity)
    .trim();
}

/** Plain text as Anki field HTML, so a `<` or `&` I typed shows as itself. */
export function textToAnkiFieldHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
