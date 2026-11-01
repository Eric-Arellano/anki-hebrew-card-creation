// The one deck and note type this tool makes cards for.
//
// Renaming a field in Anki requires updating this file and `tests/fixtures/anki/`.

export const DECK = 'עברית';
export const NOTE_TYPE = 'Hebrew';
export const TAGS: readonly string[] = [];

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

// The ones with no inputs of their own, beyond the word and its meanings.
export type PlainPartOfSpeech = Extract<PartOfSpeech, 'adverb' | 'phrase' | 'other'>;

// An adverb never changes form, so it has no unusual one to quiz.
const PARTS_OF_SPEECH_WITH_VARIANTS = PARTS_OF_SPEECH.filter(
  (partOfSpeech) => partOfSpeech !== 'adverb',
);

// The editor shows fields by what they are for, in this order, rather than in Anki's flat order.
export const FIELD_GROUPS = [
  'Grammar',
  'Disambiguation hints',
  'Unusual variants',
  'Extras',
] as const;

export type FieldGroup = (typeof FIELD_GROUPS)[number];

// `shownFor` is the parts of speech for which the editor shows the field as a textarea. A shown
// field needs a group to appear in, and a `label`, because Anki's names are terse. It may set
// `searchesImages` for a field whose text is worth an image search.
export type Field = { name: string } & (
  | { shownFor: readonly [] }
  | {
      shownFor: readonly PartOfSpeech[];
      group: FieldGroup;
      label: string;
      searchesImages?: true;
    }
);

// A field shown for no part of speech is sent to Anki as composition fills it, which is blank
// unless it comes from an input:
// - `Hebrew`, `Pointed` and `Definitions` are written by the inputs, so a second place to edit
//   them would only let the two drift apart.
// - `Images` and `Audio` are media, which the human pastes into Anki's Add window.
// - `Production answer` is composed entirely, so the human can't drift from the form the
//   Production card checks the typed answer against.
// - A noun's `Gender` and `Forms`, an adjective's `Forms`, and a verb's `Binyan` and `Root`, are
//   written entirely by their inputs.
// - A verb's `Forms` stays blank rather than guessed. **Open:** what it should hold. Wiktionary
//   offers the future 3ms, the passive counterpart and every cell of the conjugation table,
//   pointed, though the dictionary index keeps none of them yet.
export const FIELDS = {
  unpointed: { name: 'Hebrew', shownFor: [] },
  pointed: { name: 'Pointed', shownFor: [] },
  productionAnswer: { name: 'Production answer', shownFor: [] },
  definitions: { name: 'Definitions', shownFor: [] },
  productionContext: {
    name: 'Production context',
    shownFor: PARTS_OF_SPEECH,
    group: 'Disambiguation hints',
    label: 'Hint for recalling the Hebrew from its English meaning',
  },
  readingContext: {
    name: 'Reading context',
    shownFor: PARTS_OF_SPEECH,
    group: 'Disambiguation hints',
    label: 'Hint for reading the Hebrew without niqqud',
  },
  images: { name: 'Images', shownFor: [] },
  audio: { name: 'Audio', shownFor: [] },
  gender: { name: 'Gender', shownFor: [] },
  forms: {
    name: 'Forms',
    shownFor: ['other'],
    group: 'Grammar',
    label: 'Other forms',
  },
  binyan: { name: 'Binyan', shownFor: [] },
  root: { name: 'Root', shownFor: [] },
  variant1Prompt: {
    name: 'Variant 1 prompt',
    shownFor: PARTS_OF_SPEECH_WITH_VARIANTS,
    group: 'Unusual variants',
    label: 'Variant 1: English prompt',
    searchesImages: true,
  },
  variant1Answer: {
    name: 'Variant 1 answer',
    shownFor: PARTS_OF_SPEECH_WITH_VARIANTS,
    group: 'Unusual variants',
    label: 'Variant 1: Hebrew answer, with niqqud',
  },
  variant2Prompt: {
    name: 'Variant 2 prompt',
    shownFor: PARTS_OF_SPEECH_WITH_VARIANTS,
    group: 'Unusual variants',
    label: 'Variant 2: English prompt',
    searchesImages: true,
  },
  variant2Answer: {
    name: 'Variant 2 answer',
    shownFor: PARTS_OF_SPEECH_WITH_VARIANTS,
    group: 'Unusual variants',
    label: 'Variant 2: Hebrew answer, with niqqud',
  },
  examples: {
    name: 'Examples',
    shownFor: PARTS_OF_SPEECH,
    group: 'Extras',
    label: 'Examples',
  },
  notes: {
    name: 'Notes',
    shownFor: PARTS_OF_SPEECH,
    group: 'Extras',
    label: 'Notes',
  },
} as const satisfies Record<string, Field>;

export type FieldKey = keyof typeof FIELDS;

/** Field values keyed by `FIELDS` key; a field left out is blank. */
export type FieldValues = Partial<Record<FieldKey, string>>;

const FIELD_KEYS = Object.keys(FIELDS) as FieldKey[];

export const FIELD_NAMES: readonly string[] = FIELD_KEYS.map((key) => FIELDS[key].name);

/** Every field, keyed by its Anki name as `guiAddCards` takes it, blank where `valueFor` has none. */
export function toAnkiFields(
  valueFor: (key: FieldKey) => string | undefined,
): Record<string, string> {
  return Object.fromEntries(FIELD_KEYS.map((key) => [FIELDS[key].name, valueFor(key) ?? '']));
}

export type ShownFieldGroup = { group: FieldGroup; fields: FieldKey[] };

/** The fields the editor shows for `partOfSpeech`, by group, each in `liveFieldNames`' order. */
export function shownFieldGroups(
  liveFieldNames: readonly string[],
  partOfSpeech: PartOfSpeech,
): ShownFieldGroup[] {
  const keyByName = new Map<string, FieldKey>(FIELD_KEYS.map((key) => [FIELDS[key].name, key]));
  const shown = liveFieldNames.flatMap((name): [FieldKey, FieldGroup][] => {
    const key = keyByName.get(name);
    if (key === undefined) return [];
    const field: Field = FIELDS[key];
    return 'group' in field && field.shownFor.includes(partOfSpeech) ? [[key, field.group]] : [];
  });
  return FIELD_GROUPS.map((group) => ({
    group,
    fields: shown.filter(([, fieldGroup]) => fieldGroup === group).map(([key]) => key),
  })).filter(({ fields }) => fields.length > 0);
}
