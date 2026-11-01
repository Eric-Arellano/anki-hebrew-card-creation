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

// What sets each part of speech apart, shown once one is chosen.
export const PART_OF_SPEECH_HELP: Record<PartOfSpeech, string> = {
  noun: 'A noun has a gender and usually a plural, like “כֶּלֶב”, plural “כְּלָבִים”.',
  verb: 'A verb goes by its infinitive, like “לְדַבֵּר”.',
  adjective:
    'An adjective goes by its masculine singular, and agrees with its noun, like “בַּיִת גָּדוֹל” and ' +
    '“עִיר גְּדוֹלָה”.',
  adverb: 'An adverb says how, when or where, and never changes, like “מַהֵר”, “עַכְשָׁו” or “פֹּה”.',
  preposition:
    'A preposition links a word to the sentence, like “עַל” or “לִפְנֵי”, and many take pronoun ' +
    'endings, like “לְפָנַי”, “before me”.',
  phrase: 'A phrase is said as a whole, like “מַה נִּשְׁמַע” or “תּוֹדָה”.',
  other: 'Other is everything else, like “אֲנִי” or “אֲבָל”.',
};

// Help for a whole group, where help on each field would repeat itself.
export const GROUP_HELP: Partial<Record<FieldGroup, string>> = {
  'Unusual variants':
    "Use these for a form of the word that's hard to remember. You'll be quizzed on each one " +
    'separately.',
};

function productionContextHelp(example: string): string {
  return (
    'Use this if more than one Hebrew word could mean the English. Say which one you want, ' +
    `without giving it away. For example, ${example}`
  );
}

const TO_ASK_PRODUCTION_CONTEXT = productionContextHelp(
  '“to ask” could be לשאול or לבקש, so for לשאול write “a question, not a favor”.',
);

function readingContextHelp(example: string): string {
  return (
    'Use this if the Hebrew without niqqud could be read as more than one word. Write a short ' +
    `Hebrew phrase that shows which one, without translating it. For example, ${example}`
  );
}

const BOOK_READING_CONTEXT = readingContextHelp(
  'ספר could be “book”, “barber” or “he counted”, so for “book” write “קראתי ספר”.',
);

function examplesHelp(example: string): string {
  return `Phrases or sentences that use the word, each with its English. For example, ${example}`;
}

const TRAIN_EXAMPLES = examplesHelp(
  '“כרטיס רכבת (train ticket)” or “הרכבת מאחרת (the train is late)” for רכבת.',
);

// Variant 1's help sits right above Variant 2, so Variant 2 needs none.
export const FIELD_HELP = {
  productionContext: {
    noun: productionContextHelp(
      '“time” could be זמן or פעם, so for פעם write “an occasion, not a duration”.',
    ),
    verb: TO_ASK_PRODUCTION_CONTEXT,
    adjective: productionContextHelp(
      '“old” could be זקן or ישן, so for זקן write “a person, not a thing”.',
    ),
    adverb: productionContextHelp(
      '“more” could be יותר or עוד, so for יותר write “comparing, as in ‘more expensive’”.',
    ),
    preposition: productionContextHelp(
      "“at” could be ב or אצל, so for אצל write “at a person's home”.",
    ),
    phrase: productionContextHelp(
      '“how are you?” could be “מה שלומך” or “מה נשמע”, so for “מה נשמע” write “casual”.',
    ),
    other: TO_ASK_PRODUCTION_CONTEXT,
  },
  readingContext: {
    noun: BOOK_READING_CONTEXT,
    verb: BOOK_READING_CONTEXT,
    adjective: readingContextHelp(
      'ישן could be “old” or “sleeping”, so for “old” write “בית ישן”.',
    ),
    adverb: BOOK_READING_CONTEXT,
    preposition: readingContextHelp(
      'עם could be “with” or “a people”, so for “with” write “באתי עם חבר”.',
    ),
    phrase: BOOK_READING_CONTEXT,
    other: BOOK_READING_CONTEXT,
  },
  forms: {
    preposition:
      'Any pronoun endings you want to remember, one per line, each with a short label first. For ' +
      'example, for לִפְנֵי: “me: לְפָנַי”, then “us: לְפָנֵינוּ” on the next line.',
    other:
      "The word's other forms, one per line, each with a short label first. For example, for the " +
      'number שְׁנַיִם: “f: שְׁתַּיִם”, then “before a noun: שְׁנֵי” on the next line.',
  },
  variant1Prompt: {
    noun:
      "What you'll be shown. For example, “good tables” for שולחן's irregular plural, or " +
      '“female dog” for כלב. Find an image with Images (EN), then paste it into this field in ' +
      'Anki.',
    verb:
      "What you'll be shown. For example, “I will go” for ללכת's irregular future. Find an " +
      'image with Images (EN), then paste it into this field in Anki.',
    adjective:
      "What you'll be shown. For example, “other (feminine)” for אחר's irregular feminine. Find " +
      'an image with Images (EN), then paste it into this field in Anki.',
    preposition:
      "What you'll be shown. For example, “with me” for עם's irregular form. Find an image with " +
      'Images (EN), then paste it into this field in Anki.',
    phrase:
      "What you'll be shown, for wording that changes with who you address. For example, " +
      '“welcome (to a woman)” for “ברוך הבא”. Find an image with Images (EN), then paste it ' +
      'into this field in Anki.',
    other:
      "What you'll be shown, for a form that doesn't follow the usual pattern. Find an image " +
      'with Images (EN), then paste it into this field in Anki.',
  },
  variant1Answer: {
    noun:
      'The Hebrew you should recall. For example, “שֻׁלְחָנוֹת טוֹבִים” for “good tables”, or ' +
      '“כַּלְבָּה” for “female dog”.',
    verb: 'The Hebrew you should recall. For example, “אֵלֵךְ” for “I will go”.',
    adjective: 'The Hebrew you should recall. For example, “אַחֶרֶת” for “other (feminine)”.',
    preposition: 'The Hebrew you should recall. For example, “אִתִּי” for “with me”.',
    phrase: 'The Hebrew you should recall. For example, “בְּרוּכָה הַבָּאָה” for “welcome (to a woman)”.',
    other: 'The Hebrew you should recall, copied from the forms above.',
  },
  examples: {
    noun: TRAIN_EXAMPLES,
    verb: examplesHelp("“אני הולך הביתה (I'm going home)” for ללכת."),
    adjective: examplesHelp('“בית גדול (a big house)” or “העיר גדולה (the city is big)” for גדול.'),
    adverb: examplesHelp('“הוא רץ מהר (he runs fast)” for מהר.'),
    preposition: examplesHelp('“הספר על השולחן (the book is on the table)” for על.'),
    // Not “תודה! (thanks!)”: a `!` ending the Hebrew jumps to the wrong side of the left-to-right
    // field, in Anki as here.
    phrase: examplesHelp('“תודה על העזרה (thanks for the help)” for תודה.'),
    other: TRAIN_EXAMPLES,
  },
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
