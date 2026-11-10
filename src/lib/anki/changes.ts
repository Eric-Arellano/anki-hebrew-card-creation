import { splitImages } from '#lib/anki/media.ts';

// What a field reads as, whatever HTML spells it. Composition and Anki's editor write the same
// field differently: a `<div>` round each image or none, an `alt` or none, `&nbsp;` or a space, a
// `Pointed` across two lines or one. Any other difference in markup, such as bold, is a change.
function reading(html: string): string {
  const { text, images } = splitImages(html.normalize('NFC'));
  const words = text
    .replace(/<br\s*\/?>|&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return JSON.stringify([words, images]);
}

/**
 * The fields of `next` that read differently from how `held` has them, keyed by Anki field name.
 * A field left out of `held` is blank. Writing only these keeps the rest exactly as Anki holds it.
 */
export function changedFields(
  held: Readonly<Record<string, string>>,
  next: Readonly<Record<string, string>>,
): Record<string, string> {
  // `hasOwn`, so a field named like `constructor` can't find something on the prototype.
  function before(name: string): string {
    return Object.hasOwn(held, name) ? (held[name] ?? '') : '';
  }
  return Object.fromEntries(
    Object.entries(next).filter(([name, value]) => reading(value) !== reading(before(name))),
  );
}
