import {
  blankMeaning,
  completeDefinitions,
  completeVerbDefinitions,
  type Definitions,
  filledDefinitions,
  type Meaning,
  type VerbDefinitions,
} from '#lib/card/definitions.ts';
import { type AdjectiveInputs, emptyAdjectiveInputs } from '#lib/card/parts-of-speech/adjective.ts';
import {
  completeNoun,
  emptyNounDraft,
  missingNounInputs,
  type NounDraft,
  type NounInputs,
} from '#lib/card/parts-of-speech/noun.ts';
import {
  completeVerb,
  emptyVerbDraft,
  type VerbDraft,
  type VerbInputs,
} from '#lib/card/parts-of-speech/verb.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { PartOfSpeech, PlainPartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; pointed: string };

// As `formatRoot` writes it, or blank.
type RootInputs = { root: string };

// Only a verb's meanings each take a preposition.
export type CardInputs = WordInputs &
  (
    | ({ partOfSpeech: 'verb'; verb: VerbInputs; definitions: VerbDefinitions } & RootInputs)
    | ({ definitions: Definitions } & (
        | ({ partOfSpeech: 'noun'; noun: NounInputs } & RootInputs)
        | ({ partOfSpeech: 'adjective'; adjective: AdjectiveInputs } & RootInputs)
        | { partOfSpeech: PlainPartOfSpeech }
      ))
  );

// The inputs as the editor holds them while the human types: the part of speech starts unchosen,
// so the editor never guesses it. Each part of speech keeps its inputs under its own key while
// another is chosen, so switching back loses nothing, as each meaning keeps its preposition. A
// meaning row may be blank, and the root is as the human typed it.
export type CardInputsDraft = WordInputs & {
  definitions: Meaning[];
  partOfSpeech: PartOfSpeech | undefined;
  root: string;
  noun: NounDraft;
  verb: VerbDraft;
  adjective: AdjectiveInputs;
};

export function emptyInputsDraft(): CardInputsDraft {
  return {
    word: '',
    pointed: '',
    definitions: [blankMeaning()],
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

function ifBlank(input: RequiredInput, value: string | undefined): RequiredInput[] {
  return (value ?? '').trim() === '' ? [input] : [];
}

// A root may stay blank, even a verb's: nearly every verb has one, but Wiktionary lacks some, and
// the human shouldn't have to work one out to save a card. Only a typed root can be mistyped, which
// counts as missing, unless it is left over from a part of speech that showed it.
function ifMistypedRoot({ partOfSpeech, root }: CardInputsDraft): RequiredInput[] {
  return showsRoot(partOfSpeech) && root.trim() !== '' && formatRoot(root) === undefined
    ? ['root']
    : [];
}

function showsRoot(partOfSpeech: PartOfSpeech | undefined): boolean {
  return partOfSpeech === 'noun' || partOfSpeech === 'verb' || partOfSpeech === 'adjective';
}

/** The root `draft` will save, as `formatRoot` writes it, or `undefined` while it has none. */
export function draftRoot({ partOfSpeech, root }: CardInputsDraft): string | undefined {
  return showsRoot(partOfSpeech) ? formatRoot(root) : undefined;
}

function missingPrepositions(meanings: readonly Meaning[]): RequiredInput[] {
  return filledDefinitions(meanings).some(({ preposition }) => preposition === undefined)
    ? ['preposition']
    : [];
}

/** The required inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): RequiredInput[] {
  return [
    ...ifBlank('word', draft.word),
    ...ifBlank('definitions', filledDefinitions(draft.definitions)[0]?.english),
    ...ifBlank('partOfSpeech', draft.partOfSpeech),
    // A noun's gender and a verb's prepositions sit before the pointed word, and a verb's binyan
    // and any root after it.
    ...(draft.partOfSpeech === 'noun' ? missingNounInputs(draft.noun) : []),
    ...(draft.partOfSpeech === 'verb' ? missingPrepositions(draft.definitions) : []),
    ...ifBlank('pointed', draft.pointed),
    ...(draft.partOfSpeech === 'verb' ? ifBlank('binyan', draft.verb.binyan) : []),
    ...ifMistypedRoot(draft),
  ];
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, noun, verb, adjective, root, definitions: meanings, ...word } = draft;
  if (partOfSpeech === undefined || missingInputs(draft).length > 0) return undefined;
  const rootInputs = { root: formatRoot(root) ?? '' };
  if (partOfSpeech === 'verb') {
    const verbInputs = completeVerb(verb);
    const definitions = completeVerbDefinitions(meanings);
    return (
      verbInputs &&
      definitions && { ...word, ...rootInputs, definitions, partOfSpeech, verb: verbInputs }
    );
  }
  const definitions = completeDefinitions(meanings);
  if (definitions === undefined) return undefined;
  const card = { ...word, definitions };
  switch (partOfSpeech) {
    case 'noun': {
      const nounInputs = completeNoun(noun);
      return nounInputs && { ...card, ...rootInputs, partOfSpeech, noun: nounInputs };
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
