// The one deck and note type this tool makes cards for.
//
// Renaming a field in Anki requires updating this file and `tests/fixtures/anki/`.

export const DECK = 'עברית';
export const NOTE_TYPE = 'Hebrew';
export const TAGS: readonly string[] = [];

export type PartOfSpeech = 'noun' | 'verb' | 'other';

const EVERY_PART_OF_SPEECH: readonly PartOfSpeech[] = ['noun', 'verb', 'other'];

// The editor shows fields by what they are for, in this order, rather than in Anki's flat order.
export const FIELD_GROUPS = ['Answers', 'Context', 'Grammar', 'Variants', 'Extras'] as const;

type FieldGroup = (typeof FIELD_GROUPS)[number];

// `shownFor` is the parts of speech for which the editor shows the field as a textarea, and a
// shown field needs a group to appear in.
type Field = { name: string } & (
  | { shownFor: readonly [] }
  | { shownFor: readonly PartOfSpeech[]; group: FieldGroup }
);

// A field shown for no part of speech is sent to Anki as composition fills it, which is blank
// unless it comes from an input:
// - `Hebrew` and `Pointed` are the inputs themselves, so a second place to edit them would only
//   let the two drift apart.
// - `Images` and `Audio` are media, which the human pastes into Anki's Add window.
// - A verb's `Forms` is still undecided in the plan, so it stays blank rather than guessed.
export const FIELDS = {
  unpointed: { name: 'Hebrew', shownFor: [] },
  pointed: { name: 'Pointed', shownFor: [] },
  productionAnswer: { name: 'Production answer', shownFor: EVERY_PART_OF_SPEECH, group: 'Answers' },
  definitions: { name: 'Definitions', shownFor: EVERY_PART_OF_SPEECH, group: 'Answers' },
  productionContext: {
    name: 'Production context',
    shownFor: EVERY_PART_OF_SPEECH,
    group: 'Context',
  },
  readingContext: { name: 'Reading context', shownFor: EVERY_PART_OF_SPEECH, group: 'Context' },
  images: { name: 'Images', shownFor: [] },
  audio: { name: 'Audio', shownFor: [] },
  gender: { name: 'Gender', shownFor: ['noun'], group: 'Grammar' },
  forms: { name: 'Forms', shownFor: ['noun', 'other'], group: 'Grammar' },
  binyan: { name: 'Binyan', shownFor: ['verb'], group: 'Grammar' },
  root: { name: 'Root', shownFor: ['verb'], group: 'Grammar' },
  variant1Prompt: { name: 'Variant 1 prompt', shownFor: EVERY_PART_OF_SPEECH, group: 'Variants' },
  variant1Answer: { name: 'Variant 1 answer', shownFor: EVERY_PART_OF_SPEECH, group: 'Variants' },
  variant2Prompt: { name: 'Variant 2 prompt', shownFor: EVERY_PART_OF_SPEECH, group: 'Variants' },
  variant2Answer: { name: 'Variant 2 answer', shownFor: EVERY_PART_OF_SPEECH, group: 'Variants' },
  examples: { name: 'Examples', shownFor: EVERY_PART_OF_SPEECH, group: 'Extras' },
  notes: { name: 'Notes', shownFor: EVERY_PART_OF_SPEECH, group: 'Extras' },
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
