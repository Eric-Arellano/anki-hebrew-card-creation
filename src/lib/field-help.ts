// What the editor says about each field: when to fill it and what to write.
//
// The help speaks of what the human sees when studying, never of Anki's card names: the Production
// context shows beside the English, the Reading context under the Hebrew. Neither may give the
// answer away. An example goes in “curly quotes”, which `quotedParts` finds.
import {
  FIELDS,
  type Field,
  type FieldGroup,
  type FieldKey,
  type PartOfSpeech,
} from '#lib/note-type.ts';

// Given per part of speech where its examples differ.
type FieldHelp = string | Partial<Record<PartOfSpeech, string>>;

// Help for a whole group, where help on each field would repeat itself.
export const GROUP_HELP: Partial<Record<FieldGroup, string>> = {
  'Unusual variants':
    "Use these for a form of the word that's hard to remember. You'll be quizzed on each one " +
    'separately.',
};

// Variant 1's help sits right above Variant 2, so Variant 2 needs none.
export const FIELD_HELP = {
  productionContext:
    'Use this if more than one Hebrew word could mean the English. Say which one you want, ' +
    'without giving it away. For example, “to ask” could be לשאול or לבקש, so for לשאול write ' +
    '“a question, not a favor”.',
  readingContext:
    'Use this if the Hebrew without niqqud could be read as more than one word. Write a short ' +
    'Hebrew phrase that shows which one, without translating it. For example, ספר could be ' +
    '“book”, “barber” or “he counted”, so for “book” write “קראתי ספר”.',
  forms:
    "The word's other forms, one per line, each with a short label first. For example, for the " +
    'adjective גָּדוֹל: “f: גְּדוֹלָה”, then “m.pl: גְּדוֹלִים” on the next line.',
  variant1Prompt: {
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
  variant1Answer: {
    noun:
      'The Hebrew you should recall. For example, “שֻׁלְחָנוֹת טוֹבִים” for “good tables”, or ' +
      '“כַּלְבָּה” for “female dog”.',
    verb: 'The Hebrew you should recall. For example, “אֵלֵךְ” for “I will go”.',
    other: 'The Hebrew you should recall, copied from the forms above.',
  },
  examples:
    'Phrases or sentences that use the word, each with its English. For example, ' +
    '“כרטיס רכבת (train ticket)” or “הרכבת מאחרת (the train is late)” for רכבת.',
  notes:
    'Anything else worth remembering about the word. For example, ' +
    '“homophone with קרה (to happen)” for קרא.',
} as const satisfies Partial<Record<FieldKey, FieldHelp>>;

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
  const helpByField: Partial<Record<FieldKey, FieldHelp>> = FIELD_HELP;
  const help = helpByField[key];
  return {
    label: field.label,
    help: typeof help === 'object' ? help[partOfSpeech] : help,
    searchesImages: field.searchesImages,
  };
}

export type TextPart = { text: string; quoted: boolean };

/** `text` split around its “quoted” examples, without the quote marks. */
export function quotedParts(text: string): TextPart[] {
  return text
    .split(/“([^”]*)”/)
    .map((part, index) => ({ text: part, quoted: index % 2 === 1 }))
    .filter((part) => part.quoted || part.text !== '');
}
