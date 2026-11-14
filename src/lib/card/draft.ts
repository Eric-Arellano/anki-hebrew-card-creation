// Everything the editor holds of the card itself, which a note loaded from Anki would fill. The
// dictionary entry picked and Anki's status belong to the session, not the card, so they stay out.
import {
  type CardInputsDraft,
  emptyInputsDraft,
  INPUT_NAMES,
  missingInputs,
} from '#lib/card/inputs.ts';
import type { Attachment } from '#lib/media/attach.ts';
import type { FieldValues, VariantPrompt } from '#lib/note-type.ts';

export type MediaDraft = {
  images: Attachment[];
  noImage: boolean;
  // Kept while another part of speech hides the variants, as their text is.
  promptImages: Record<VariantPrompt, Attachment[]>;
  // `Audio` holds one recording, as every note in the deck does.
  audio: Attachment | undefined;
};

export type CardDraft = {
  inputs: CardInputsDraft;
  // Each shown field's textarea, as the human typed it.
  edits: FieldValues;
  media: MediaDraft;
};

export function emptyCardDraft(): CardDraft {
  return {
    inputs: emptyInputsDraft(),
    edits: {},
    media: {
      images: [],
      noImage: false,
      promptImages: { variant1Prompt: [], variant2Prompt: [] },
      audio: undefined,
    },
  };
}

/** What still blocks handing `draft` off, as the editor names it, in the order it shows them. */
export function stillNeeded({ inputs, media }: CardDraft): string[] {
  const missing = missingInputs(inputs).map((key) => INPUT_NAMES[key]);
  // Images are how the human learns, so skipping one is a choice they make, not a slip. It stays a
  // choice because a word like גם has nothing to picture, and a hard rule would force a junk image.
  return media.images.length === 0 && !media.noImage ? [...missing, 'image'] : missing;
}

// Plain objects and arrays by their contents, and anything else, like an attachment's blob, by
// identity.
function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isPlainContainer(a) || !isPlainContainer(b) || Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) =>
    isSameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

function isPlainContainer(value: unknown): value is object {
  return (
    Array.isArray(value) ||
    (typeof value === 'object' &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype)
  );
}

/** Whether `now` differs from `start`, the draft the editor began with, in more than its word. */
export function changedBeyondWord(start: CardDraft, now: CardDraft): boolean {
  return !isSameValue({ ...now, inputs: { ...now.inputs, word: start.inputs.word } }, start);
}
