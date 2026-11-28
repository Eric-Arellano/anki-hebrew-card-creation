import {
  blankMeaning,
  completeMeanings,
  completeVerbMeanings,
  filledMeanings,
  type Meaning,
  type Meanings,
  type VerbMeanings,
} from '#lib/card/meanings.ts';
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
import { hasInfinitive } from '#lib/hebrew/binyan.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { PartOfSpeech, PlainPartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; wordPointed: string };

// As `formatRoot` writes it, or blank.
type RootInputs = { root: string };

export type CardInputs = WordInputs &
  (
    | ({ partOfSpeech: 'verb'; verb: VerbInputs; meanings: VerbMeanings } & RootInputs)
    | ({ meanings: Meanings } & (
        | ({ partOfSpeech: 'noun'; noun: NounInputs } & RootInputs)
        | ({ partOfSpeech: 'adjective'; adjective: AdjectiveInputs } & RootInputs)
        | { partOfSpeech: PlainPartOfSpeech }
      ))
  );

// The inputs as the editor holds them while the human types: the part of speech starts unchosen,
// so the editor never guesses it. Each part of speech keeps its inputs under its own key while
// another is chosen, so switching back loses nothing. A meaning row may be blank, and the root is
// as the human typed it.
export type CardInputsDraft = WordInputs & {
  meanings: Meaning[];
  partOfSpeech: PartOfSpeech | undefined;
  root: string;
  noun: NounDraft;
  verb: VerbDraft;
  adjective: AdjectiveInputs;
};

export function emptyInputsDraft(): CardInputsDraft {
  return {
    word: '',
    wordPointed: '',
    meanings: [blankMeaning()],
    partOfSpeech: undefined,
    root: '',
    noun: emptyNounDraft(),
    verb: emptyVerbDraft(),
    adjective: emptyAdjectiveInputs(),
  };
}

type RequiredInput =
  | keyof WordInputs
  | 'meanings'
  | 'partOfSpeech'
  | 'gender'
  | 'preposition'
  | 'unpointedPast'
  | 'binyan'
  | 'root';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word without niqqud',
  meanings: 'English meaning',
  partOfSpeech: 'part of speech',
  gender: 'gender',
  preposition: 'preposition',
  wordPointed: 'Hebrew word with niqqud',
  unpointedPast: 'past (he) without niqqud',
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

// The past comes before the binyan in the editor's row of forms, and is there only while the
// binyan has an infinitive to go beside.
function missingVerbInputs({ binyan, unpointedPast }: VerbDraft): RequiredInput[] {
  return [
    ...(hasInfinitive(binyan) ? ifBlank('unpointedPast', unpointedPast) : []),
    ...ifBlank('binyan', binyan),
  ];
}

function missingPrepositions(meanings: readonly Meaning[]): RequiredInput[] {
  return filledMeanings(meanings).some(({ preposition }) => preposition === undefined)
    ? ['preposition']
    : [];
}

/** The required inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): RequiredInput[] {
  return [
    ...ifBlank('word', draft.word),
    ...ifBlank('meanings', filledMeanings(draft.meanings)[0]?.english),
    ...ifBlank('partOfSpeech', draft.partOfSpeech),
    // A noun's gender and a verb's prepositions sit before the pointed word, and a verb's past,
    // binyan and any root after it.
    ...(draft.partOfSpeech === 'noun' ? missingNounInputs(draft.noun) : []),
    ...(draft.partOfSpeech === 'verb' ? missingPrepositions(draft.meanings) : []),
    ...ifBlank('wordPointed', draft.wordPointed),
    ...(draft.partOfSpeech === 'verb' ? missingVerbInputs(draft.verb) : []),
    ...ifMistypedRoot(draft),
  ];
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, noun, verb, adjective, root, meanings: meaningLines, ...word } = draft;
  if (partOfSpeech === undefined || missingInputs(draft).length > 0) return undefined;
  const rootInputs = { root: formatRoot(root) ?? '' };
  if (partOfSpeech === 'verb') {
    const verbInputs = completeVerb(verb);
    const meanings = completeVerbMeanings(meaningLines);
    return (
      verbInputs && meanings && { ...word, ...rootInputs, meanings, partOfSpeech, verb: verbInputs }
    );
  }
  const meanings = completeMeanings(meaningLines);
  if (meanings === undefined) return undefined;
  const card = { ...word, meanings };
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
