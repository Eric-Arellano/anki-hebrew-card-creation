import {
  completeNoun,
  emptyNounDraft,
  missingNounInputs,
  type NounDraft,
  type NounInputs,
} from '#lib/card/noun.ts';
import {
  completeVerb,
  emptyVerbDraft,
  missingVerbInputs,
  type VerbDraft,
  type VerbInputs,
} from '#lib/card/verb.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; pointed: string };

// Each English meaning, trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [string, ...string[]];

export type CardInputs = WordInputs & { definitions: Definitions } & (
    | { partOfSpeech: 'noun'; noun: NounInputs }
    | { partOfSpeech: 'verb'; verb: VerbInputs }
    | { partOfSpeech: 'other' }
  );

// The inputs as the editor holds them while the human types: the part of speech starts unchosen,
// so the editor never guesses it. Each part of speech keeps its inputs under its own key while
// another is chosen, so switching back loses nothing. A meaning row may be blank.
export type CardInputsDraft = WordInputs & {
  definitions: string[];
  partOfSpeech: PartOfSpeech | undefined;
  noun: NounDraft;
  verb: VerbDraft;
};

export function emptyDraft(): CardInputsDraft {
  return {
    word: '',
    pointed: '',
    definitions: [''],
    partOfSpeech: undefined,
    noun: emptyNounDraft(),
    verb: emptyVerbDraft(),
  };
}

type RequiredInput =
  | keyof WordInputs
  | 'definitions'
  | 'partOfSpeech'
  | 'gender'
  | 'binyan'
  | 'root';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word without niqqud',
  definitions: 'English meaning',
  partOfSpeech: 'part of speech',
  gender: 'gender',
  pointed: 'Hebrew word with niqqud',
  binyan: 'binyan',
  root: 'root',
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
    // A noun's gender sits before the pointed word, and a verb's binyan and root after it.
    ...(draft.partOfSpeech === 'noun' ? missingNounInputs(draft.noun) : []),
    ...ifBlank('pointed', draft.pointed),
    ...(draft.partOfSpeech === 'verb' ? missingVerbInputs(draft.verb) : []),
  ];
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, noun, verb, definitions: definitionRows, ...word } = draft;
  const [first, ...rest] = filledDefinitions(definitionRows);
  if (partOfSpeech === undefined || first === undefined || missingInputs(draft).length > 0) {
    return undefined;
  }
  const card = { ...word, definitions: [first, ...rest] satisfies Definitions };
  switch (partOfSpeech) {
    case 'noun': {
      const nounInputs = completeNoun(noun);
      return nounInputs && { ...card, partOfSpeech, noun: nounInputs };
    }
    case 'verb': {
      const verbInputs = completeVerb(verb);
      return verbInputs && { ...card, partOfSpeech, verb: verbInputs };
    }
    case 'other':
      return { ...card, partOfSpeech };
  }
}
