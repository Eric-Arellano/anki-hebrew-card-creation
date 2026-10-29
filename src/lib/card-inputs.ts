import type { PartOfSpeech } from '#lib/note-type.ts';

export type CardInputs = {
  word: string;
  partOfSpeech: PartOfSpeech;
  gloss: string;
  pointed: string;
};

// The inputs as the editor holds them while the human types: part of speech starts unchosen, so the
// editor never guesses it.
export type CardInputsDraft = Omit<CardInputs, 'partOfSpeech'> & {
  partOfSpeech: PartOfSpeech | undefined;
};

/** How the editor's messages name each input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<keyof CardInputs, string>> = {
  word: 'Hebrew word',
  pointed: 'niqqud',
  gloss: 'English meaning',
  partOfSpeech: 'part of speech',
};

const INPUT_ORDER: readonly (keyof CardInputs)[] = ['word', 'pointed', 'gloss', 'partOfSpeech'];

/** The inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): (keyof CardInputs)[] {
  return INPUT_ORDER.filter((key) => (draft[key] ?? '').trim() === '');
}

/** `draft` as `CardInputs` once every input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech } = draft;
  if (partOfSpeech === undefined || missingInputs(draft).length > 0) return undefined;
  return { ...draft, partOfSpeech };
}
