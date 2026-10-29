import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import { FIELDS, type PartOfSpeech } from '#lib/note-type.ts';

export type CardInputs = {
  word: string;
  partOfSpeech: PartOfSpeech;
  gloss: string;
  pointed: string;
};

// The inputs as the editor holds them while the human types: part of speech starts unchosen, so the
// editor never guesses it.
export type InputsDraft = Omit<CardInputs, 'partOfSpeech'> & {
  partOfSpeech: PartOfSpeech | undefined;
};

const INPUT_ORDER: readonly (keyof CardInputs)[] = ['word', 'pointed', 'gloss', 'partOfSpeech'];

/** The inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: InputsDraft): (keyof CardInputs)[] {
  return INPUT_ORDER.filter((key) => (draft[key] ?? '').trim() === '');
}

/** `draft` as `CardInputs` once every input is filled, else `undefined`. */
export function completeInputs(draft: InputsDraft): CardInputs | undefined {
  const { partOfSpeech } = draft;
  if (partOfSpeech === undefined || missingInputs(draft).length > 0) return undefined;
  return { ...draft, partOfSpeech };
}

/** What composition suggests for each field it can fill, keyed by Anki field name, as HTML. */
export function composeSuggestions(inputs: CardInputs): Record<string, string> {
  const word = textToAnkiFieldHtml(inputs.word.trim());
  return {
    // What the human typed, never derived from the pointed form: `דִּבֵּר` strips to `דבר`, not `דיבר`.
    [FIELDS.unpointed.name]: word,
    [FIELDS.pointed.name]: textToAnkiFieldHtml(inputs.pointed.trim()),
    [FIELDS.definitions.name]: textToAnkiFieldHtml(inputs.gloss.trim()),
    // A noun's carries טוב and a verb's its preposition, so those are left to their own
    // composition rather than guessed.
    [FIELDS.productionAnswer.name]: inputs.partOfSpeech === 'other' ? word : '',
  };
}
