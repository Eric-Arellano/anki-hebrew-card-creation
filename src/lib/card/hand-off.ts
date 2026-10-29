import { textareaToAnkiFieldHtml } from '#lib/anki/html.ts';
import { type FieldKey, type FieldValues, toAnkiFields } from '#lib/note-type.ts';

/** Every field as `/api/anki/add` takes it: a shown field's edit, else what composition gives it. */
export function handOffFields({
  composed,
  edits,
  shownFields,
}: {
  composed: FieldValues;
  edits: FieldValues;
  shownFields: readonly FieldKey[];
}): Record<string, string> {
  // A hidden field gets only what composition gives it, so an edit made under another part of
  // speech, such as forms typed for an adjective before switching to noun, never reaches Anki.
  return toAnkiFields((field) => {
    const edit = shownFields.includes(field) ? edits[field] : undefined;
    return edit === undefined ? composed[field] : textareaToAnkiFieldHtml(edit);
  });
}
