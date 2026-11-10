import { decodeHtmlEntities, textToAnkiFieldHtml } from '#lib/anki/html.ts';

/** An `Images` field's HTML, or a variant prompt's images, from the names Anki stored them under. */
export function imagesToAnkiFieldHtml(filenames: readonly string[]): string {
  return filenames
    .map((filename) => {
      const src = textToAnkiFieldHtml(filename).replaceAll('"', '&quot;');
      return `<div><img src="${src}"></div>`;
    })
    .join('');
}

// A quoted attribute value may hold a `>`, as an `alt` copied from a page title can.
const IMG_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const SRC_ATTRIBUTE = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
// Anki's editor leaves an image in a `div`, sometimes with a `<br>` after it, and a prompt's text
// apart from its images by blank lines.
const EMPTY_DIV = /<div>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>/gi;
const SPACE_AT_ENDS = /^(?:\s|&nbsp;|<br\s*\/?>)+|(?:\s|&nbsp;|<br\s*\/?>)+$/gi;

/**
 * `html`'s images by the names Anki stored them under, in order, and the HTML left around them,
 * without the wrappers and blank lines that held them. The one reader of image HTML.
 */
export function splitImages(html: string): { text: string; images: string[] } {
  const images: string[] = [];
  const withoutImages = html.replace(IMG_TAG, (tag) => {
    const [, doubleQuoted, singleQuoted, unquoted] = tag.match(SRC_ATTRIBUTE) ?? [];
    const src = doubleQuoted ?? singleQuoted ?? unquoted;
    // An image with no file isn't one Anki shows, so it stays in the text, where the human sees it.
    if (src === undefined) return tag;
    images.push(decodeHtmlEntities(src));
    return '';
  });
  return { text: withoutEmptyDivs(withoutImages).replace(SPACE_AT_ENDS, ''), images };
}

// Nested ones empty from the inside out: `<div><div></div></div>`.
function withoutEmptyDivs(html: string): string {
  const fewer = html.replace(EMPTY_DIV, '');
  return fewer === html ? html : withoutEmptyDivs(fewer);
}

/** An `Audio` field's value, from the name Anki stored the file under. */
export function soundToAnkiField(filename: string): string {
  return `[sound:${textToAnkiFieldHtml(filename)}]`;
}

/** The name of each file `soundToAnkiField` wrote into `value`, in order. */
export function soundsInAnkiField(value: string): string[] {
  return [...value.matchAll(/\[sound:([^\]]*)\]/g)].map(([, filename]) =>
    decodeHtmlEntities(filename ?? ''),
  );
}
