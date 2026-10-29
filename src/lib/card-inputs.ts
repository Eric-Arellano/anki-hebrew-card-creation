import type { PartOfSpeech } from '#lib/note-type.ts';

export type Gender = 'm' | 'f' | 'mf';

// The forms are pointed, as the human copies them from a dictionary, and any may be blank. Only a
// masculine noun has a feminine counterpart (כלב → כלבה); any other has just its plural.
export type NounInputs =
  | { gender: 'm'; plural: string; feminine: string; femininePlural: string }
  | { gender: 'f' | 'mf'; plural: string };

type WordInputs = { word: string; pointed: string };

// Each English meaning, trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [string, ...string[]];

export type CardInputs = WordInputs & { definitions: Definitions } & (
    | { partOfSpeech: 'noun'; noun: NounInputs }
    | { partOfSpeech: Exclude<PartOfSpeech, 'noun'> }
  );

// The inputs as the editor holds them while the human types: part of speech and gender start
// unchosen, so the editor never guesses them. The noun's inputs are kept under another part of
// speech, so switching back loses nothing. A meaning row may be blank.
export type CardInputsDraft = WordInputs & {
  definitions: string[];
  partOfSpeech: PartOfSpeech | undefined;
  noun: Omit<Extract<NounInputs, { gender: 'm' }>, 'gender'> & { gender: Gender | undefined };
};

type RequiredInput = keyof WordInputs | 'definitions' | 'partOfSpeech' | 'gender';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word without niqqud',
  definitions: 'English meaning',
  partOfSpeech: 'part of speech',
  gender: 'gender',
  pointed: 'Hebrew word with niqqud',
};

function inputValue(draft: CardInputsDraft, key: RequiredInput): string | undefined {
  switch (key) {
    case 'definitions':
      return firstDefinition(draft.definitions);
    case 'gender':
      return draft.noun.gender;
    default:
      return draft[key];
  }
}

function filledDefinitions(definitions: readonly string[]): string[] {
  return definitions
    .map((definition) => definition.trim())
    .filter((definition) => definition !== '');
}

/** The first meaning the human has typed, trimmed, or `undefined` while every row is blank. */
export function firstDefinition(definitions: readonly string[]): string | undefined {
  return filledDefinitions(definitions)[0];
}

/** The required inputs still blank in `draft`, in the order the editor shows them. */
export function missingInputs(draft: CardInputsDraft): RequiredInput[] {
  const required: readonly RequiredInput[] =
    draft.partOfSpeech === 'noun'
      ? ['word', 'definitions', 'partOfSpeech', 'gender', 'pointed']
      : ['word', 'definitions', 'partOfSpeech', 'pointed'];
  return required.filter((key) => (inputValue(draft, key) ?? '').trim() === '');
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
  const { gender, plural, ...counterpart } = noun;
  if (gender === undefined) return undefined;
  return {
    ...word,
    definitions,
    partOfSpeech,
    noun: gender === 'm' ? { gender, plural, ...counterpart } : { gender, plural },
  };
}
