import {
  completeNoun,
  emptyNounDraft,
  missingNounInputs,
  type NounDraft,
  type NounInputs,
} from '#lib/card/noun.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; pointed: string };

// Each English meaning, trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [string, ...string[]];

export type CardInputs = WordInputs & { definitions: Definitions } & (
    | { partOfSpeech: 'noun'; noun: NounInputs }
    | { partOfSpeech: Exclude<PartOfSpeech, 'noun'> }
  );

// The inputs as the editor holds them while the human types: the part of speech starts unchosen,
// so the editor never guesses it. Each part of speech keeps its inputs under its own key while
// another is chosen, so switching back loses nothing. A meaning row may be blank.
export type CardInputsDraft = WordInputs & {
  definitions: string[];
  partOfSpeech: PartOfSpeech | undefined;
  noun: NounDraft;
};

export function emptyDraft(): CardInputsDraft {
  return {
    word: '',
    pointed: '',
    definitions: [''],
    partOfSpeech: undefined,
    noun: emptyNounDraft(),
  };
}

type RequiredInput = keyof WordInputs | 'definitions' | 'partOfSpeech' | 'gender';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word without niqqud',
  definitions: 'English meaning',
  partOfSpeech: 'part of speech',
  gender: 'gender',
  pointed: 'Hebrew word with niqqud',
};

function filledDefinitions(definitions: readonly string[]): string[] {
  return definitions
    .map((definition) => definition.trim())
    .filter((definition) => definition !== '');
}

function ifBlank(input: RequiredInput, value: string | undefined): RequiredInput[] {
  return (value ?? '').trim() === '' ? [input] : [];
}

/** The required inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): RequiredInput[] {
  return [
    ...ifBlank('word', draft.word),
    ...ifBlank('definitions', filledDefinitions(draft.definitions)[0]),
    ...ifBlank('partOfSpeech', draft.partOfSpeech),
    // The part of speech's own inputs sit between its chips and the pointed word.
    ...(draft.partOfSpeech === 'noun' ? missingNounInputs(draft.noun) : []),
    ...ifBlank('pointed', draft.pointed),
  ];
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, noun, definitions: definitionRows, ...word } = draft;
  const [first, ...rest] = filledDefinitions(definitionRows);
  if (partOfSpeech === undefined || first === undefined || missingInputs(draft).length > 0) {
    return undefined;
  }
  const definitions: Definitions = [first, ...rest];
  if (partOfSpeech !== 'noun') return { ...word, definitions, partOfSpeech };
  const nounInputs = completeNoun(noun);
  if (nounInputs === undefined) return undefined;
  return { ...word, definitions, partOfSpeech, noun: nounInputs };
}
