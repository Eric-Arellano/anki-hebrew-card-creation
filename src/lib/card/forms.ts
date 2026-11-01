import { textToAnkiFieldHtml } from '#lib/anki/html.ts';

export type FormLine = [label: string, form: string];

/** The `Forms` field: one `label: form` line each. A blank form is left out, not labelled. */
export function formsHtml(lines: readonly FormLine[]): string {
  return lines
    .map(([label, form]): FormLine => [label, form.trim()])
    .filter(([, form]) => form !== '')
    .map(([label, form]) => `${label}: ${textToAnkiFieldHtml(form)}`)
    .join('<br>');
}
