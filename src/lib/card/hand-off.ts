import { textareaToAnkiFieldHtml } from '#lib/anki/html.ts';
import { imagesToAnkiFieldHtml, soundToAnkiField } from '#lib/anki/media.ts';
import { type FieldKey, type FieldValues, toAnkiFields } from '#lib/note-type.ts';

/** The names Anki stored the note's media under, never the names requested. */
export type StoredMedia = {
  images?: readonly string[];
  audio?: string;
  variant1Prompt?: readonly string[];
  variant2Prompt?: readonly string[];
};

/** Every field as `/api/anki/add` takes it: a shown field's edit, else what composition gives it. */
export function handOffFields({
  composed,
  edits,
  shownFields,
  media = {},
}: {
  composed: FieldValues;
  edits: FieldValues;
  shownFields: readonly FieldKey[];
  media?: StoredMedia;
}): Record<string, string> {
  // `Images` and `Audio` are never shown as textareas, so only the prompts answer to `shownFields`.
  function promptImages(field: 'variant1Prompt' | 'variant2Prompt') {
    return imagesToAnkiFieldHtml(shownFields.includes(field) ? (media[field] ?? []) : []);
  }
  const mediaHtml: FieldValues = {
    images: imagesToAnkiFieldHtml(media.images ?? []),
    audio: media.audio === undefined ? '' : soundToAnkiField(media.audio),
    variant1Prompt: promptImages('variant1Prompt'),
    variant2Prompt: promptImages('variant2Prompt'),
  };

  // A hidden field gets only what composition gives it, so an edit made under another part of
  // speech, such as forms typed for a number before switching to noun, never reaches Anki.
  return toAnkiFields((field) => {
    const edit = shownFields.includes(field) ? edits[field] : undefined;
    const text = edit === undefined ? composed[field] : textareaToAnkiFieldHtml(edit);
    return `${text ?? ''}${mediaHtml[field] ?? ''}`;
  });
}
