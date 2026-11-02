import { textToAnkiFieldHtml } from '#lib/anki/html.ts';

/** An `Images` field's HTML, or a variant prompt's images, from the names Anki stored them under. */
export function imagesToAnkiFieldHtml(filenames: readonly string[]): string {
  return filenames
    .map((filename) => {
      const src = textToAnkiFieldHtml(filename).replaceAll('"', '&quot;');
      return `<div><img src="${src}"></div>`;
    })
    .join('');
}

/** An `Audio` field's value, from the name Anki stored the file under. */
export function soundToAnkiField(filename: string): string {
  return `[sound:${textToAnkiFieldHtml(filename)}]`;
}
