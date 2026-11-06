import { textareaToAnkiFieldHtml } from '#lib/anki/html.ts';
import { imagesToAnkiFieldHtml, soundToAnkiField } from '#lib/anki/media.ts';
import type { MediaDraft } from '#lib/card/draft.ts';
import type { Attachment } from '#lib/media/attach.ts';
import {
  type FieldKey,
  type FieldValues,
  toAnkiFields,
  VARIANT_ANSWERS,
  type VariantPrompt,
} from '#lib/note-type.ts';

type AttachmentsByField = Partial<
  Record<'images' | 'audio' | VariantPrompt, readonly Attachment[]>
>;

// A hidden field gets nothing from the human, so a variant's images stay out while another part of
// speech hides the variants, just as their text does. `Images` and `Audio` are never shown as a
// textarea, and always reach the note.
function attachmentsReachingNote(
  media: MediaDraft,
  shownFields: readonly FieldKey[],
): AttachmentsByField {
  const prompts = Object.keys(VARIANT_ANSWERS) as VariantPrompt[];
  return {
    images: media.images,
    audio: media.audio === undefined ? [] : [media.audio],
    ...Object.fromEntries(
      prompts
        .filter((prompt) => shownFields.includes(prompt))
        .map((prompt) => [prompt, media.promptImages[prompt]]),
    ),
  };
}

/** Each file the note will hold, once, to store before its fields can be composed. */
export function attachmentsToStore(
  media: MediaDraft,
  shownFields: readonly FieldKey[],
): Attachment[] {
  const all = Object.values(attachmentsReachingNote(media, shownFields)).flat();
  return all.filter(
    ({ filename }, index) => all.findIndex((a) => a.filename === filename) === index,
  );
}

/**
 * Every field as `/api/anki/add` takes it: a shown field's edit, else what composition gives it,
 * followed by its media under the names in `storedAs`, which maps each name requested to the one
 * Anki used.
 */
export function handOffFields({
  composed,
  edits,
  shownFields,
  media,
  storedAs = new Map(),
}: {
  composed: FieldValues;
  edits: FieldValues;
  shownFields: readonly FieldKey[];
  media?: MediaDraft;
  storedAs?: ReadonlyMap<string, string>;
}): Record<string, string> {
  function storedName({ filename }: Attachment): string {
    const name = storedAs.get(filename);
    if (name === undefined) throw new Error(`${filename} was never stored`);
    return name;
  }
  const attachments = media === undefined ? {} : attachmentsReachingNote(media, shownFields);
  const mediaHtml: FieldValues = Object.fromEntries(
    Object.entries(attachments).map(([field, list]) => {
      const names = list.map(storedName);
      return [
        field,
        field === 'audio' ? names.map(soundToAnkiField).join('') : imagesToAnkiFieldHtml(names),
      ];
    }),
  );

  // A hidden field gets only what composition gives it, so an edit made under another part of
  // speech, such as forms typed for a number before switching to noun, never reaches Anki.
  return toAnkiFields((field) => {
    const edit = shownFields.includes(field) ? edits[field] : undefined;
    const text = edit === undefined ? composed[field] : textareaToAnkiFieldHtml(edit);
    return `${text ?? ''}${mediaHtml[field] ?? ''}`;
  });
}
