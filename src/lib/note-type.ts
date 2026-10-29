// The one deck and note type this tool makes cards for.
//
// Renaming a field in Anki requires updating this file and `tests/fixtures/anki/`.

export const DECK = 'עברית';
export const NOTE_TYPE = 'Hebrew';
export const TAGS: readonly string[] = [];

export const PARTS_OF_SPEECH = ['noun', 'verb', 'other'] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

// The editor shows fields by what they are for, in this order, rather than in Anki's flat order.
export const FIELD_GROUPS = [
  'Grammar',
  'Disambiguation hints',
  'Unusual variants',
  'Extras',
] as const;

type FieldGroup = (typeof FIELD_GROUPS)[number];

// Help for a whole group, where help on each field would repeat itself.
export const GROUP_HELP: Partial<Record<FieldGroup, string>> = {
  'Unusual variants':
    "Use these for a form of the word that's hard to remember. You'll be quizzed on each one " +
    'separately.',
};

// `shownFor` is the parts of speech for which the editor shows the field as a textarea. A shown
// field needs a group to appear in, and a `label`, because Anki's names are terse. It may carry
// `help` saying when to fill it and what to write, given per part of speech where its examples
// differ, and `searchesImages` for a field whose text is worth an image search.
type Field = { name: string } & (
  | { shownFor: readonly [] }
  | {
      shownFor: readonly PartOfSpeech[];
      group: FieldGroup;
      label: string;
      help?: string | Partial<Record<PartOfSpeech, string>>;
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
// - A noun's `Gender` and `Forms`, and a verb's `Binyan` and `Root`, are written entirely by their
//   inputs.
// - A verb's `Forms` is still undecided in the plan, so it stays blank rather than guessed.
//
// The help speaks of what the human sees when studying, never of Anki's card names: the
// Production context shows beside the English, the Reading context under the Hebrew. Neither may
// give the answer away. An example goes in “curly quotes”, which `quotedParts` finds.
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
    help:
      'Use this if more than one Hebrew word could mean the English. Say which one you want, ' +
      'without giving it away. For example, “to ask” could be לשאול or לבקש, so for לשאול write ' +
      '“a question, not a favor”.',
  },
  readingContext: {
    name: 'Reading context',
    shownFor: PARTS_OF_SPEECH,
    group: 'Disambiguation hints',
    label: 'Hint for reading the Hebrew without niqqud',
    help:
      'Use this if the Hebrew without niqqud could be read as more than one word. Write a short ' +
      'Hebrew phrase that shows which one, without translating it. For example, ספר could be ' +
      '“book”, “barber” or “he counted”, so for “book” write “קראתי ספר”.',
  },
  images: { name: 'Images', shownFor: [] },
  audio: { name: 'Audio', shownFor: [] },
  gender: { name: 'Gender', shownFor: [] },
  forms: {
    name: 'Forms',
    shownFor: ['other'],
    group: 'Grammar',
    label: 'Other forms',
    help:
      "The word's other forms, one per line, each with a short label first. For example, for the " +
      'adjective גָּדוֹל: “f: גְּדוֹלָה”, then “m.pl: גְּדוֹלִים” on the next line.',
  },
  binyan: { name: 'Binyan', shownFor: [] },
  root: { name: 'Root', shownFor: [] },
  variant1Prompt: {
    name: 'Variant 1 prompt',
    shownFor: PARTS_OF_SPEECH,
    group: 'Unusual variants',
    label: 'Variant 1: English prompt',
    help: {
      noun:
        "What you'll be shown. For example, “good tables” for שולחן's irregular plural, or " +
        '“female dog” for כלב. Find an image with Images (EN), then paste it into this field in ' +
        'Anki.',
      verb:
        "What you'll be shown. For example, “I will go” for ללכת's irregular future. Find an " +
        'image with Images (EN), then paste it into this field in Anki.',
      other:
        "What you'll be shown, for a form that doesn't follow the usual pattern. Find an image " +
        'with Images (EN), then paste it into this field in Anki.',
    },
    searchesImages: true,
  },
  variant1Answer: {
    name: 'Variant 1 answer',
    shownFor: PARTS_OF_SPEECH,
    group: 'Unusual variants',
    label: 'Variant 1: Hebrew answer, with niqqud',
    help: {
      noun:
        'The Hebrew you should recall. For example, “שֻׁלְחָנוֹת טוֹבִים” for “good tables”, or ' +
        '“כַּלְבָּה” for “female dog”.',
      verb: 'The Hebrew you should recall. For example, “אֵלֵךְ” for “I will go”.',
      other: 'The Hebrew you should recall, copied from the forms above.',
    },
  },
  // Variant 1's help sits right above, so Variant 2 needs none.
  variant2Prompt: {
    name: 'Variant 2 prompt',
    shownFor: PARTS_OF_SPEECH,
    group: 'Unusual variants',
    label: 'Variant 2: English prompt',
    searchesImages: true,
  },
  variant2Answer: {
    name: 'Variant 2 answer',
    shownFor: PARTS_OF_SPEECH,
    group: 'Unusual variants',
    label: 'Variant 2: Hebrew answer, with niqqud',
  },
  examples: {
    name: 'Examples',
    shownFor: PARTS_OF_SPEECH,
    group: 'Extras',
    label: 'Examples',
    help:
      'Phrases or sentences that use the word, each with its English. For example, ' +
      '“כרטיס רכבת (train ticket)” or “הרכבת מאחרת (the train is late)” for רכבת.',
  },
  notes: {
    name: 'Notes',
    shownFor: PARTS_OF_SPEECH,
    group: 'Extras',
    label: 'Notes',
    help:
      'Anything else worth remembering about the word. For example, ' +
      '“homophone with קרה (to happen)” for קרא.',
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

/** How the editor shows a field: its name, what it says about when to fill it, and any search. */
export function fieldDisplay(
  key: FieldKey,
  partOfSpeech: PartOfSpeech,
): {
  label: string;
  help?: string;
  searchesImages?: true;
} {
  const field: Field = FIELDS[key];
  if (!('group' in field)) return { label: field.name };
  const help = typeof field.help === 'object' ? field.help[partOfSpeech] : field.help;
  return { label: field.label, help, searchesImages: field.searchesImages };
}

export type TextPart = { text: string; quoted: boolean };

/** `text` split around its “quoted” examples, without the quote marks. */
export function quotedParts(text: string): TextPart[] {
  return text
    .split(/“([^”]*)”/)
    .map((part, index) => ({ text: part, quoted: index % 2 === 1 }))
    .filter((part) => part.quoted || part.text !== '');
}
