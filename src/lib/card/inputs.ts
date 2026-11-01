import { type AdjectiveInputs, emptyAdjectiveInputs } from '#lib/card/adjective.ts';
import {
  completeNoun,
  emptyNounDraft,
  missingNounInputs,
  type NounDraft,
  type NounInputs,
} from '#lib/card/noun.ts';
import { completeVerb, emptyVerbDraft, type VerbDraft, type VerbInputs } from '#lib/card/verb.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { PartOfSpeech, PlainPartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; pointed: string };

// Each English meaning, trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [string, ...string[]];

// As `formatRoot` writes it, or blank.
type RootInputs = { root: string };

export type CardInputs = WordInputs & { definitions: Definitions } & (
    | ({ partOfSpeech: 'noun'; noun: NounInputs } & RootInputs)
    | ({ partOfSpeech: 'verb'; verb: VerbInputs } & RootInputs)
    | ({ partOfSpeech: 'adjective'; adjective: AdjectiveInputs } & RootInputs)
    | { partOfSpeech: PlainPartOfSpeech }
  );

// The inputs as the editor holds them while the human types: the part of speech starts unchosen,
// so the editor never guesses it. Each part of speech keeps its inputs under its own key while
// another is chosen, so switching back loses nothing. A meaning row may be blank, and the root is
// as the human typed it.
export type CardInputsDraft = WordInputs & {
  definitions: string[];
  partOfSpeech: PartOfSpeech | undefined;
  root: string;
  noun: NounDraft;
  verb: VerbDraft;
  adjective: AdjectiveInputs;
};

export function emptyDraft(): CardInputsDraft {
  return {
    word: '',
    pointed: '',
    definitions: [''],
    partOfSpeech: undefined,
    root: '',
    noun: emptyNounDraft(),
    verb: emptyVerbDraft(),
    adjective: emptyAdjectiveInputs(),
  };
}

type RequiredInput =
  | keyof WordInputs
  | 'definitions'
  | 'partOfSpeech'
  | 'gender'
  | 'preposition'
  | 'binyan'
  | 'root';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word without niqqud',
  definitions: 'English meaning',
  partOfSpeech: 'part of speech',
  gender: 'gender',
  preposition: 'preposition',
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

// A root may stay blank, even a verb's: nearly every verb has one, but Wiktionary lacks some, and
// the human shouldn't have to work one out to save a card. Only a typed root can be mistyped, which
// counts as missing, unless it is left over from a part of speech that showed it.
function ifMistypedRoot({ partOfSpeech, root }: CardInputsDraft): RequiredInput[] {
  const showsRoot =
    partOfSpeech === 'noun' || partOfSpeech === 'verb' || partOfSpeech === 'adjective';
  return showsRoot && root.trim() !== '' && formatRoot(root) === undefined ? ['root'] : [];
}

/** The required inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): RequiredInput[] {
  return [
    ...ifBlank('word', draft.word),
    ...ifBlank('definitions', filledDefinitions(draft.definitions)[0]),
    ...ifBlank('partOfSpeech', draft.partOfSpeech),
    // A noun's gender and a verb's preposition sit before the pointed word, and a verb's binyan and
    // any root after it.
    ...(draft.partOfSpeech === 'noun' ? missingNounInputs(draft.noun) : []),
    ...(draft.partOfSpeech === 'verb' ? ifBlank('preposition', draft.verb.preposition) : []),
    ...ifBlank('pointed', draft.pointed),
    ...(draft.partOfSpeech === 'verb' ? ifBlank('binyan', draft.verb.binyan) : []),
    ...ifMistypedRoot(draft),
  ];
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, noun, verb, adjective, root, definitions: definitionRows, ...word } = draft;
  const [first, ...rest] = filledDefinitions(definitionRows);
  if (partOfSpeech === undefined || first === undefined || missingInputs(draft).length > 0) {
    return undefined;
  }
  const card = { ...word, definitions: [first, ...rest] satisfies Definitions };
  const rootInputs = { root: formatRoot(root) ?? '' };
  switch (partOfSpeech) {
    case 'noun': {
      const nounInputs = completeNoun(noun);
      return nounInputs && { ...card, ...rootInputs, partOfSpeech, noun: nounInputs };
    }
    case 'verb': {
      const verbInputs = completeVerb(verb);
      return verbInputs && { ...card, ...rootInputs, partOfSpeech, verb: verbInputs };
    }
    case 'adjective':
      return { ...card, ...rootInputs, partOfSpeech, adjective };
    case 'adverb':
    case 'preposition':
    case 'phrase':
    case 'other':
      return { ...card, partOfSpeech };
  }
}
