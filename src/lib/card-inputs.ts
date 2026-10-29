import type { PartOfSpeech } from '#lib/note-type.ts';

type WordInputs = { word: string; pointed: string };

// Each English meaning, trimmed, in the order the human typed them. There is always a first one.
export type Definitions = readonly [string, ...string[]];

export type CardInputs = WordInputs & { definitions: Definitions; partOfSpeech: PartOfSpeech };

// The inputs as the editor holds them while the human types: part of speech starts unchosen, so the
// editor never guesses it. A meaning row may be blank.
export type CardInputsDraft = WordInputs & {
  definitions: string[];
  partOfSpeech: PartOfSpeech | undefined;
};

type RequiredInput = keyof WordInputs | 'definitions' | 'partOfSpeech';

/** How the editor's messages name each required input, in the order the editor shows them. */
export const INPUT_NAMES: Readonly<Record<RequiredInput, string>> = {
  word: 'Hebrew word',
  pointed: 'niqqud',
  definitions: 'English meaning',
  partOfSpeech: 'part of speech',
};

const INPUT_ORDER: readonly RequiredInput[] = ['word', 'pointed', 'definitions', 'partOfSpeech'];

function inputValue(draft: CardInputsDraft, key: RequiredInput): string | undefined {
  switch (key) {
    case 'definitions':
      return firstDefinition(draft.definitions);
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
  return INPUT_ORDER.filter((key) => (inputValue(draft, key) ?? '').trim() === '');
}

/** `draft` as `CardInputs` once every required input is filled, else `undefined`. */
export function completeInputs(draft: CardInputsDraft): CardInputs | undefined {
  const { partOfSpeech, definitions: definitionRows, ...word } = draft;
  const [first, ...rest] = filledDefinitions(definitionRows);
  if (partOfSpeech === undefined || first === undefined || missingInputs(draft).length > 0) {
    return undefined;
  }
  const definitions: Definitions = [first, ...rest];
  return { ...word, definitions, partOfSpeech };
}
