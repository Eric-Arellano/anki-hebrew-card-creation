import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';

export type FormLine = [label: string, form: string];

/** The `Forms` field: one `label: form` line each. A blank form is left out, not labelled. */
export function formsHtml(lines: readonly FormLine[]): string {
  return lines
    .map(([label, form]): FormLine => [label, form.trim()])
    .filter(([, form]) => form !== '')
    .map(([label, form]) => `${label}: ${textToAnkiFieldHtml(form)}`)
    .join('<br>');
}

/**
 * Each form in a `Forms` field by its label, as `formsHtml` wrote them. A line with no label is
 * left out, and of a label on two lines, the first.
 */
export function formsByLabel(html: string): ReadonlyMap<string, string> {
  const lines = html.split(/<br\s*\/?>/i).flatMap((line): FormLine[] => {
    const match = ankiFieldHtmlToText(line).match(/^([a-z.]+):\s*(.*)$/s);
    return match?.[1] === undefined || match[2] === undefined ? [] : [[match[1], match[2]]];
  });
  return new Map(
    lines.filter(([label], index) => lines.findIndex(([other]) => other === label) === index),
  );
}
