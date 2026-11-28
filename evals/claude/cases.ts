// What the eval asks Claude about. Unlike the fixtures in `tests/`, these are written, not copied
// from real data, since an eval needs known mistakes planted in notes. Their Hebrew was written by
// Claude, not a native speaker, and another Claude reviewed it adversarially: a "clean" note here
// is only as clean as that, so a note Claude keeps faulting may be a case to fix rather than a
// false alarm.
import type { CheckRequest, SuggestRequest, VerbMeaningsRequest } from '#lib/api/ai.ts';
import {
  type Meaning,
  meaningsToAnkiFieldHtml,
  type PrepositionChoice,
} from '#lib/card/meanings.ts';
import type { GovernedPreposition } from '#lib/hebrew/preposition.ts';
import type { FieldKey, FieldValues } from '#lib/note-type.ts';
import type { Homograph } from '#lib/server/ai/homographs.ts';

/** A note to review, and the fields a right review faults: none when the note is clean. */
export type CheckCase = {
  name: string;
  request: CheckRequest;
  homographs: Homograph[];
  faults: FieldKey[];
};

export type SuggestCase = { request: SuggestRequest; homographs: Homograph[] };

// The Examples field as the editor writes it, from Hebrew and English pairs.
function examples(...pairs: [hebrew: string, english: string][]): string {
  return pairs
    .map(
      ([hebrew, english]) =>
        `<bdi lang="he">${hebrew}</bdi><span class="sep"> — </span>` +
        `<span lang="en">${english}</span>`,
    )
    .join('<br>');
}

// A verb's Definitions as the editor saves them, each meaning with its preposition's pill.
type Line = [english: string, preposition: PrepositionChoice];
function meaning([english, preposition]: Line): Meaning {
  return { english, preposition };
}
function meanings(first: Line, ...rest: Line[]): string {
  return meaningsToAnkiFieldHtml([meaning(first), ...rest.map(meaning)]);
}

function note(
  name: string,
  partOfSpeech: CheckRequest['partOfSpeech'],
  fields: FieldValues,
  faults: FieldKey[],
  homographs: Homograph[] = [],
): CheckCase {
  return { name, request: { partOfSpeech, fields }, homographs, faults };
}

// What the dictionary lists as the other readings of ספר.
const SEFER_HOMOGRAPHS: Homograph[] = [
  { pointed: 'סַפָּר', partOfSpeech: 'noun', definitions: ['barber'] },
  { pointed: 'סָפַר', partOfSpeech: 'verb', definitions: ['to count'] },
  { pointed: 'סְפָר', partOfSpeech: 'noun', definitions: ['border, frontier'] },
];

const kelev = {
  word: 'כלב',
  wordPointed: 'כֶּלֶב',
  meanings: 'dog',
  gender: 'm',
  root: 'כ־ל־ב',
  forms: 'plural: כְּלָבִים',
};
const sefer = {
  word: 'ספר',
  wordPointed: 'סֵפֶר',
  gender: 'm',
  root: 'ס־פ־ר',
  forms: 'plural: סְפָרִים',
};
const lishmor = {
  word: 'לשמור',
  wordPointed: 'לִשְׁמֹר',
  binyan: "pa'al",
  root: 'ש־מ־ר',
};
const lechakot = {
  word: 'לחכות',
  wordPointed: 'לְחַכּוֹת',
  meanings: meanings(['to wait (for)', 'ל']),
  binyan: "pi'el",
  root: 'ח־כ־ה',
};

export const CHECK_CASES: CheckCase[] = [
  // Clean notes, some with Hebrew that looks suspicious to a learner but is what Israelis say.
  note(
    'kelev',
    'noun',
    {
      ...kelev,
      examples: examples(['הכלב שלי גדול.', 'My dog is big.'], ['יש לי כלב.', 'I have a dog.']),
    },
    [],
  ),
  note(
    'sefer',
    'noun',
    {
      ...sefer,
      meanings: 'book',
      readingContext: 'קראתי ספר מעניין',
      examples: examples(
        ['אני קורא ספר.', 'I am reading a book.'],
        ['יש לי הרבה ספרים.', 'I have a lot of books.'],
      ),
    },
    [],
    SEFER_HOMOGRAPHS,
  ),
  note(
    'lechakot',
    'verb',
    {
      ...lechakot,
      examples: examples(
        ['אני מחכה לאוטובוס.', 'I am waiting for the bus.'],
        ['חיכינו הרבה זמן.', 'We waited a long time.'],
      ),
    },
    [],
  ),
  note(
    'chadash',
    'adjective',
    {
      word: 'חדש',
      wordPointed: 'חָדָשׁ',
      meanings: 'new',
      forms: 'feminine: חֲדָשָׁה<br>plural: חֲדָשִׁים',
      examples: examples(
        ['הטלפון שלי חדש.', 'My phone is new.'],
        ['יש לה מכונית חדשה.', 'She has a new car.'],
      ),
      notes: 'Plural חדשים, feminine plural חדשות.',
    },
    [],
  ),
  note(
    'lilmod',
    'verb',
    {
      word: 'ללמוד',
      wordPointed: 'לִלְמֹד',
      meanings: meanings(['to learn, study', 'את']),
      binyan: "pa'al",
      root: 'ל־מ־ד',
      examples: examples(
        ['אני לומד עברית.', 'I am learning Hebrew.'],
        ['היא למדה באוניברסיטה.', 'She studied at the university.'],
      ),
    },
    [],
  ),
  note(
    'lishol',
    'verb',
    {
      word: 'לשאול',
      wordPointed: 'לִשְׁאֹל',
      meanings: meanings(['to ask', 'את']),
      binyan: "pa'al",
      root: 'ש־א־ל',
      examples: examples(
        ['הוא שאל אותי שאלה.', 'He asked me a question.'],
        ['אפשר לשאול משהו?', 'Can I ask something?'],
      ),
    },
    [],
  ),
  note(
    'mafteach',
    'noun',
    {
      word: 'מפתח',
      wordPointed: 'מַפְתֵּחַ',
      meanings: 'key',
      gender: 'm',
      forms: 'plural: מַפְתְּחוֹת',
      examples: examples(
        ['יש לי את המפתח.', 'I have the key.'],
        ['איפה המפתחות?', 'Where are the keys?'],
      ),
    },
    [],
  ),
  note(
    'chaver',
    'noun',
    {
      word: 'חבר',
      wordPointed: 'חָבֵר',
      meanings: 'friend<br>boyfriend<br>member',
      gender: 'm',
      examples: examples(
        ['הוא חבר טוב שלי.', 'He is a good friend of mine.'],
        ['יש לה חבר חדש.', 'She has a new boyfriend.'],
      ),
    },
    [],
  ),

  // A mistake planted in each.
  note(
    'kelev, feminine adjective',
    'noun',
    {
      ...kelev,
      examples: examples(['הכלב שלי גדולה.', 'My dog is big.'], ['יש לי כלב.', 'I have a dog.']),
    },
    ['examples'],
  ),
  note(
    'sefer, a homograph’s meaning',
    'noun',
    {
      ...sefer,
      meanings: 'book<br>barber',
      examples: examples(['אני קורא ספר.', 'I am reading a book.']),
    },
    ['meanings'],
    SEFER_HOMOGRAPHS,
  ),
  note(
    'sefer, an example in a homograph’s sense',
    'noun',
    {
      ...sefer,
      meanings: 'book',
      examples: examples(
        ['אני קורא ספר.', 'I am reading a book.'],
        ['הספר גזר לי את השיער.', 'The barber cut my hair.'],
      ),
    },
    ['examples'],
    SEFER_HOMOGRAPHS,
  ),
  note(
    'sefer, a Reading context for the barber',
    'noun',
    {
      ...sefer,
      meanings: 'book',
      readingContext: 'יש לו מספריים ומסרק',
      examples: examples(['אני קורא ספר.', 'I am reading a book.']),
    },
    ['readingContext'],
    SEFER_HOMOGRAPHS,
  ),
  note(
    'lechakot, את for ל',
    'verb',
    {
      ...lechakot,
      examples: examples(
        ['אני מחכה את האוטובוס.', 'I am waiting for the bus.'],
        ['חיכינו הרבה זמן.', 'We waited a long time.'],
      ),
    },
    ['examples'],
  ),
  note(
    'lehitkasher, את for ל',
    'verb',
    {
      word: 'להתקשר',
      wordPointed: 'לְהִתְקַשֵּׁר',
      meanings: meanings(['to call (on the phone)', 'ל']),
      binyan: "hitpa'el",
      root: 'ק־ש־ר',
      examples: examples(['התקשרתי את אמא שלי.', 'I called my mom.']),
    },
    ['examples'],
  ),
  note(
    'lehitanyen, על for ב',
    'verb',
    {
      word: 'להתעניין',
      wordPointed: 'לְהִתְעַנְיֵן',
      meanings: meanings(['to be interested (in)', 'ב']),
      binyan: "hitpa'el",
      examples: examples(['אני מתעניין על היסטוריה.', 'I am interested in history.']),
    },
    ['examples'],
  ),
  note(
    'laazor, את for ל',
    'verb',
    {
      word: 'לעזור',
      wordPointed: 'לַעֲזֹר',
      meanings: meanings(['to help', 'ל']),
      binyan: "pa'al",
      root: 'ע־ז־ר',
      examples: examples(['עזרתי אותו בשיעורי הבית.', 'I helped him with the homework.']),
    },
    ['examples'],
  ),
  note(
    'sameach, על before an infinitive',
    'adjective',
    {
      word: 'שמח',
      wordPointed: 'שָׂמֵחַ',
      meanings: 'happy, glad',
      forms: 'feminine: שְׂמֵחָה',
      examples: examples(
        ['אני שמח על לראות אותך.', 'I am happy to see you.'],
        ['היא שמחה היום.', 'She is happy today.'],
      ),
    },
    ['examples'],
  ),
  note(
    'higayon, a calque of “makes sense”',
    'noun',
    {
      word: 'היגיון',
      wordPointed: 'הִגָּיוֹן',
      meanings: 'logic, sense',
      gender: 'm',
      examples: examples(['זה עושה היגיון.', 'That makes sense.']),
    },
    ['examples'],
  ),
  note(
    'leehov, stilted word order',
    'verb',
    {
      word: 'לאהוב',
      wordPointed: 'לֶאֱהֹב',
      meanings: meanings(['to love, like', 'את']),
      binyan: "pa'al",
      examples: examples(['אני אוהב מאוד אותה.', 'I love her very much.']),
    },
    ['examples'],
  ),
  note(
    'yalda, a masculine numeral',
    'noun',
    {
      word: 'ילדה',
      wordPointed: 'יַלְדָּה',
      meanings: 'girl',
      gender: 'f',
      forms: 'plural: יְלָדוֹת',
      examples: examples(
        ['יש לי שלושה ילדות.', 'I have three girls.'],
        ['הילדה משחקת בפארק.', 'The girl is playing in the park.'],
      ),
    },
    ['examples'],
  ),
  note(
    'shulchan, English that says chair',
    'noun',
    {
      word: 'שולחן',
      wordPointed: 'שֻׁלְחָן',
      meanings: 'table',
      gender: 'm',
      examples: examples(['השולחן בחדר.', 'The chair is in the room.']),
    },
    ['examples'],
  ),
  note(
    'od, English that says already',
    'adverb',
    {
      word: 'עוד',
      wordPointed: 'עוֹד',
      meanings: 'still, yet<br>more',
      examples: examples(
        ['עוד לא אכלתי.', 'I already ate.'],
        ['אני רוצה עוד קפה.', 'I want more coffee.'],
      ),
    },
    ['examples'],
  ),
  note(
    'bayit, a Production context that names it',
    'noun',
    {
      word: 'בית',
      wordPointed: 'בַּיִת',
      meanings: 'house, home',
      gender: 'm',
      productionContext: 'as in בית ספר',
      examples: examples(['אני בבית.', 'I am at home.']),
    },
    ['productionContext'],
  ),
  note(
    'ir, a note that calls it masculine',
    'noun',
    {
      word: 'עיר',
      wordPointed: 'עִיר',
      meanings: 'city',
      gender: 'f',
      forms: 'plural: עָרִים',
      examples: examples(['תל אביב היא עיר גדולה.', 'Tel Aviv is a big city.']),
      notes: 'Masculine, despite its plural ערים.',
    },
    ['notes'],
  ),
  note(
    'beitza, a note with the swamp’s plural',
    'noun',
    {
      word: 'ביצה',
      wordPointed: 'בֵּיצָה',
      meanings: 'egg',
      gender: 'f',
      examples: examples(['אני אוכל ביצה בבוקר.', 'I eat an egg in the morning.']),
      notes: 'Plural ביצות.',
    },
    ['notes'],
  ),
  note(
    'regel, a Gender its example contradicts',
    'noun',
    {
      word: 'רגל',
      wordPointed: 'רֶגֶל',
      meanings: 'leg, foot',
      gender: 'm',
      examples: examples(['הרגל שלי כואבת.', 'My leg hurts.']),
    },
    ['gender'],
  ),
  // Harder mistakes, ones a careful learner could miss.
  note(
    'laila, a masculine noun that ends in ה',
    'noun',
    {
      word: 'לילה',
      wordPointed: 'לַיְלָה',
      meanings: 'night',
      gender: 'm',
      forms: 'plural: לֵילוֹת',
      examples: examples(
        ['הלילה הייתה ארוכה.', 'The night was long.'],
        ['עבדתי כל הלילה.', 'I worked all night.'],
      ),
    },
    ['examples'],
  ),
  note(
    'shana, a masculine numeral for its ־ים plural',
    'noun',
    {
      word: 'שנה',
      wordPointed: 'שָׁנָה',
      meanings: 'year',
      gender: 'f',
      forms: 'plural: שָׁנִים',
      examples: examples(
        ['גרתי שם שני שנים.', 'I lived there for two years.'],
        ['השנה אני לומד עברית.', 'This year I am studying Hebrew.'],
      ),
    },
    ['examples'],
  ),
  note(
    'sefer, a Reading context that fits the barber too',
    'noun',
    {
      ...sefer,
      meanings: 'book',
      readingContext: 'הוא ספר טוב',
      examples: examples(['אני קורא ספר.', 'I am reading a book.']),
    },
    ['readingContext'],
    SEFER_HOMOGRAPHS,
  ),
  note(
    "liftoach, pa'al where it needs nif'al",
    'verb',
    {
      word: 'לפתוח',
      wordPointed: 'לִפְתֹּחַ',
      meanings: meanings(['to open', 'את']),
      binyan: "pa'al",
      root: 'פ־ת־ח',
      examples: examples(
        ['הדלת פתחה לאט.', 'The door opened slowly.'],
        ['פתחתי את החלון.', 'I opened the window.'],
      ),
    },
    ['examples'],
  ),

  // A verb's prepositions, as the Definitions pair them with its meanings. The clean ones hold
  // what the prompt says to leave alone.
  note(
    'lishmor, a preposition per meaning, one without an example',
    'verb',
    {
      ...lishmor,
      meanings: meanings(
        ['to keep', 'את'],
        ['to guard, look after', 'על'],
        ['to save (a file)', 'את'],
      ),
      examples: examples(
        ['שמרתי את המכתב שלה.', 'I kept her letter.'],
        ['היא שומרת על הילדים בערב.', 'She looks after the kids in the evening.'],
      ),
    },
    [],
  ),
  note(
    'ledaber, none for a language',
    'verb',
    {
      word: 'לדבר',
      wordPointed: 'לְדַבֵּר',
      meanings: meanings(
        ['to talk with', 'עם'],
        ['to talk about', 'על'],
        ['to speak (a language)', 'none'],
      ),
      binyan: "pi'el",
      root: 'ד־ב־ר',
      examples: examples(
        ['דיברתי עם אמא שלי.', 'I talked with my mom.'],
        ['הם מדברים על הסרט.', 'They are talking about the movie.'],
        ['אני מדבר עברית.', 'I speak Hebrew.'],
      ),
    },
    [],
  ),
  note(
    'lachshov, none before a ש clause',
    'verb',
    {
      word: 'לחשוב',
      wordPointed: 'לַחְשֹׁב',
      meanings: meanings(['to think about', 'על'], ['to think (that)', 'none']),
      binyan: "pa'al",
      root: 'ח־ש־ב',
      examples: examples(
        ['אני חושב על המבחן.', 'I am thinking about the test.'],
        ['אני חושב שהוא צודק.', 'I think that he is right.'],
      ),
    },
    [],
  ),
  note(
    'lirot, no את before an indefinite object',
    'verb',
    {
      word: 'לראות',
      wordPointed: 'לִרְאוֹת',
      meanings: meanings(['to see', 'את']),
      binyan: "pa'al",
      root: 'ר־א־ה',
      examples: examples(['ראיתי סרט טוב אתמול.', 'I saw a good movie yesterday.']),
    },
    [],
  ),
  note(
    'lehistakel, ב where על fits too',
    'verb',
    {
      word: 'להסתכל',
      wordPointed: 'לְהִסְתַּכֵּל',
      meanings: meanings(['to look at', 'ב']),
      binyan: "hitpa'el",
      root: 'ס־כ־ל',
      examples: examples(['הוא מסתכל בשעון.', 'He is looking at the clock.']),
    },
    [],
  ),
  note(
    'laazor, את on the meaning',
    'verb',
    {
      word: 'לעזור',
      wordPointed: 'לַעֲזֹר',
      meanings: meanings(['to help', 'את']),
      binyan: "pa'al",
      root: 'ע־ז־ר',
    },
    ['meanings'],
  ),
  note(
    'lishmor, an example’s preposition for another meaning',
    'verb',
    {
      ...lishmor,
      meanings: meanings(['to keep', 'את'], ['to guard, look after', 'על']),
      examples: examples(
        ['שמרתי את המכתב שלה.', 'I kept her letter.'],
        ['אני שומר את הילדים של אחותי.', 'I look after my sister’s kids.'],
      ),
    },
    ['examples'],
  ),
];

// A verb's meanings are given with their prepositions, and any other word's as its English alone.
function word(
  word: string,
  pointed: string,
  partOfSpeech: SuggestRequest['partOfSpeech'],
  meaningLines: (string | Meaning)[],
  forms: SuggestRequest['forms'] = [],
  homographs: Homograph[] = [],
): SuggestCase {
  const meanings = meaningLines.map((meaning) =>
    typeof meaning === 'string' ? { english: meaning } : meaning,
  );
  return {
    request: { word, pointed, partOfSpeech, meanings, forms },
    homographs,
  };
}

// Suggestions have no right answer to grade against, so the eval prints them to read.
export const SUGGEST_CASES: SuggestCase[] = [
  word('לחכות', 'לְחַכּוֹת', 'verb', [{ english: 'to wait (for)', preposition: 'ל' }]),
  word('להתקשר', 'לְהִתְקַשֵּׁר', 'verb', [
    { english: 'to call (on the phone)', preposition: 'ל' },
    { english: 'to become attached', preposition: 'ל' },
  ]),
  word('להצליח', 'לְהַצְלִיחַ', 'verb', [{ english: 'to succeed', preposition: 'none' }]),
  word('לשמור', 'לִשְׁמֹר', 'verb', [
    { english: 'to keep', preposition: 'את' },
    { english: 'to guard, look after', preposition: 'על' },
  ]),
  word('לדבר', 'לְדַבֵּר', 'verb', [
    { english: 'to talk with', preposition: 'עם' },
    { english: 'to talk about', preposition: 'על' },
    { english: 'to speak (a language)', preposition: 'none' },
  ]),
  // More lines than the old cap of four examples, two of them sharing a preposition.
  word('לקרוא', 'לִקְרֹא', 'verb', [
    { english: 'to read', preposition: 'את' },
    { english: 'to read about', preposition: 'על' },
    { english: 'to call (someone)', preposition: 'ל' },
    { english: 'to name, call (someone something)', preposition: 'ל' },
    { english: 'to call out, shout', preposition: 'none' },
  ]),
  word('ספר', 'סֵפֶר', 'noun', ['book'], [{ label: 'plural', form: 'סְפָרִים' }], SEFER_HOMOGRAPHS),
  word('עיר', 'עִיר', 'noun', ['city'], [{ label: 'plural', form: 'עָרִים' }]),
  word('ילדה', 'יַלְדָּה', 'noun', ['girl', 'daughter'], [{ label: 'plural', form: 'יְלָדוֹת' }]),
  word('שמח', 'שָׂמֵחַ', 'adjective', ['happy, glad'], [{ label: 'feminine', form: 'שְׂמֵחָה' }]),
  word('כבר', 'כְּבָר', 'adverb', ['already']),
];

/**
 * A verb to suggest meanings for, and the prepositions a right answer may give: every suggested
 * meaning whose English holds `meaning` takes one of `takes`, and at least one does hold it.
 */
export type VerbMeaningsCase = {
  name: string;
  request: VerbMeaningsRequest;
  expected: { meaning: string; takes: PrepositionChoice[] }[];
};

function verb(
  name: string,
  [word, pointed]: [string, string],
  dictionaryDefinitions: string[],
  meanings: Meaning[],
  expected: VerbMeaningsCase['expected'],
  dictionaryPrepositions: GovernedPreposition[] = [],
): VerbMeaningsCase {
  return {
    name,
    request: { word, pointed, meanings, dictionaryDefinitions, dictionaryPrepositions },
    expected,
  };
}

// The definitions are Wiktionary's, as the dictionary holds them.
const LISHMOR: [string, string] = ['לשמור', 'לִשְׁמֹר'];
const LISHMOR_DEFINITIONS = ['to guard', '(by extension) to keep', '(computing) to save'];
const LEHISTAKEL: [string, string] = ['להסתכל', 'לְהִסְתַּכֵּל'];

export const VERB_MEANINGS_CASES: VerbMeaningsCase[] = [
  verb('lishmor, blank', LISHMOR, LISHMOR_DEFINITIONS, [], [{ meaning: 'guard', takes: ['על'] }]),
  verb(
    'lishmor, one line to split',
    LISHMOR,
    LISHMOR_DEFINITIONS,
    [{ english: 'to keep, guard' }],
    [{ meaning: 'guard', takes: ['על'] }],
  ),
  verb(
    'ledaber',
    ['לדבר', 'לְדַבֵּר'],
    ['to speak (say words)'],
    [{ english: 'to speak, talk' }],
    [{ meaning: 'speak', takes: ['עם', 'על', 'ב', 'none'] }],
  ),
  verb(
    'lesaper, blank',
    ['לספר', 'לְסַפֵּר'],
    [
      '(transitive) to tell (a story), to narrate, to recount',
      '(transitive) to cut the hair of, to give a haircut to',
      '(Mishnaic, intransitive) to speak',
      '(Biblical) to declare',
    ],
    [],
    [{ meaning: 'tell', takes: ['את', 'ל', 'על'] }],
  ),
  verb(
    'likro, blank',
    ['לקרוא', 'לִקְרֹא'],
    ['to read', 'to call', 'to crow'],
    [],
    [{ meaning: 'read', takes: ['את', 'ל', 'על'] }],
  ),
  verb(
    'laavod, blank',
    ['לעבוד', 'לַעֲבֹד'],
    [
      'to work, labor',
      'to work, operate, function',
      'to work on, convince, improve',
      'to worship',
      'to dupe, deceive, trick, bullshit, mess with, be played [with עַל (ál) ‘on’]',
    ],
    [],
    [{ meaning: 'work', takes: ['none', 'על', 'עם'] }],
    ['על'],
  ),
  verb(
    'latet, blank',
    ['לתת', 'לָתֵת'],
    [
      'to give',
      'to allow, permit, let',
      '(archaic) to put, place',
      '(archaic, Biblical) to turn into',
    ],
    [],
    [{ meaning: 'give', takes: ['את', 'ל'] }],
  ),
  verb(
    'laazor, את chosen',
    ['לעזור', 'לַעֲזֹר'],
    ['to help, to assist'],
    [{ english: 'to help', preposition: 'את' }],
    [{ meaning: 'help', takes: ['ל', 'ב', 'עם'] }],
  ),
  verb(
    'lirtzot, blank',
    ['לרצות', 'לִרְצוֹת'],
    ['To want.', '(Biblical) accept, choose'],
    [],
    [{ meaning: 'want', takes: ['את', 'מ'] }],
  ),
  verb(
    'lachshov, blank',
    ['לחשוב', 'לַחְשֹׁב'],
    ['to think'],
    [],
    [{ meaning: 'think', takes: ['על', 'none'] }],
  ),
  verb(
    'lalechet, all chosen',
    ['ללכת', 'לָלֶכֶת'],
    ['to walk, go', 'to happen, go on', 'to go away, depart'],
    [
      { english: 'to walk, go', preposition: 'ל' },
      { english: 'to happen, go on', preposition: 'none' },
      { english: 'to go away, depart', preposition: 'none' },
    ],
    // The learner's None stays, since you can just say הוא הלך, and “from” gets a line of its own.
    [
      { meaning: 'go away, depart', takes: ['none'] },
      { meaning: 'from', takes: ['מ'] },
    ],
  ),
  verb(
    'lehistakel, blank',
    LEHISTAKEL,
    ['to look at [with בְּ־]'],
    [],
    [{ meaning: 'look', takes: ['ב', 'על'] }],
    ['ב'],
  ),
  verb(
    'lehistakel, ב chosen',
    LEHISTAKEL,
    ['to look at [with בְּ־]'],
    [{ english: 'to look at', preposition: 'ב' }],
    [{ meaning: 'look', takes: ['ב'] }],
    ['ב'],
  ),
  verb(
    'lefached, blank',
    ['לפחד', 'לְפַחֵד'],
    ['To fear, to be afraid or scared.'],
    [],
    [{ meaning: 'afraid of', takes: ['מ'] }],
  ),
  verb(
    'lomar',
    ['לומר', 'לוֹמַר'],
    ['to say, tell', 'to intend', 'to mean'],
    [{ english: 'to say, tell' }],
    [{ meaning: 'say', takes: ['את', 'ל', 'על'] }],
  ),
  verb(
    'lishol, blank',
    ['לשאול', 'לִשְׁאֹל'],
    ['to ask (a question), to query', 'to borrow (an item)'],
    [],
    [
      { meaning: 'ask', takes: ['את', 'על'] },
      { meaning: 'borrow', takes: ['את', 'מ'] },
    ],
  ),
  verb(
    'lagur, blank',
    ['לגור', 'לָגוּר'],
    ['to dwell, reside, live'],
    [],
    [{ meaning: 'live', takes: ['ב', 'עם'] }],
  ),
  verb(
    'lishmoa, no dictionary',
    ['לשמוע', ''],
    [],
    [{ english: 'to hear' }],
    [{ meaning: 'hear', takes: ['את', 'על', 'מ'] }],
  ),
  verb(
    'lirot, shades',
    ['לראות', 'לִרְאוֹת'],
    [
      'To see, to have vision; figuratively, to perceive.',
      '(archaic) To observe, look at; figuratively, to consider.',
    ],
    [{ english: 'to see' }, { english: 'to watch' }],
    [{ meaning: 'see', takes: ['את', 'ב'] }],
  ),
  verb(
    'lehitkasher, blank',
    ['להתקשר', 'לְהִתְקַשֵּׁר'],
    [
      'to phone, call someone on a telephone [with לְ־]',
      'to be connected, to be tied to, to associate, to evoke.',
    ],
    [],
    [{ meaning: 'call', takes: ['ל'] }],
    ['ל'],
  ),
  verb(
    'levakesh, blank',
    ['לבקש', 'לְבַקֵּשׁ'],
    ['(transitive) to ask for, request', '(formal) to seek, strive for'],
    [],
    [{ meaning: 'ask', takes: ['את', 'מ'] }],
  ),
  verb(
    'lilmod, blank',
    ['ללמוד', 'לִלְמֹד'],
    ['to learn, to study'],
    [],
    [{ meaning: 'learn', takes: ['את', 'על', 'מ', 'none'] }],
  ),
];
