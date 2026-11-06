// Everything the editor holds of the card itself, which a note loaded from Anki would fill. The
// dictionary entry picked and Anki's status belong to the session, not the card, so they stay out.
import { type CardInputsDraft, emptyDraft, INPUT_NAMES, missingInputs } from '#lib/card/inputs.ts';
import type { ImageAttachment } from '#lib/media/image.ts';
import type { FieldValues, VariantPrompt } from '#lib/note-type.ts';

/** Attachments not yet stored, under the names the browser gave them. */
export type MediaDraft = {
  images: ImageAttachment[];
  noImage: boolean;
  // Kept while another part of speech hides the variants, as their text is.
  promptImages: Record<VariantPrompt, ImageAttachment[]>;
};

export type CardDraft = {
  inputs: CardInputsDraft;
  // Each shown field's textarea, as the human typed it.
  edits: FieldValues;
  media: MediaDraft;
};

export function emptyCardDraft(): CardDraft {
  return {
    inputs: emptyDraft(),
    edits: {},
    media: { images: [], noImage: false, promptImages: { variant1Prompt: [], variant2Prompt: [] } },
  };
}

/** What still blocks handing `draft` off, as the editor names it, in the order it shows them. */
export function stillNeeded({ inputs, media }: CardDraft): string[] {
  const missing = missingInputs(inputs).map((key) => INPUT_NAMES[key]);
  // Images are how the human learns, so skipping one is a choice they make, not a slip. It stays a
  // choice because a word like גם has nothing to picture, and a hard rule would force a junk image.
  return media.images.length === 0 && !media.noImage ? [...missing, 'image'] : missing;
}
