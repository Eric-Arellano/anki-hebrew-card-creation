import { describe, expect, test } from 'vitest';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import { loadedNote } from '#tests/real-notes.ts';
import { draftFromNote } from './from-note.ts';
import { type CardInputsDraft, emptyDraft } from './inputs.ts';
import { prefillBlanks, prefillDraft, stillSpellsEntry, undoPrefill } from './prefill.ts';

// As the lookup answers for the fixture dictionary.
const kelev: DictionaryCandidate = {
  id: 1,
  title: 'כלב',
  pointed: 'כֶּלֶב',
  wiktionaryPartOfSpeech: 'noun',
  definitions: ['dog'],
  roots: [],
  partOfSpeech: 'noun',
  noun: {
    gender: { gender: 'm', pluralOnly: false },
    plurals: ['כְּלָבִים'],
    feminineSingulars: ['כַּלְבָּה'],
    femininePlurals: ['כְּלָבוֹת'],
  },
};

const diber: DictionaryCandidate = {
  id: 30,
  title: 'דיבר',
  pointed: 'דִּבֵּר',
  wiktionaryPartOfSpeech: 'verb',
  definitions: ['to speak (say words)'],
  roots: ['ד־ב־ר'],
  partOfSpeech: 'verb',
  verb: {
    binyan: "pi'el",
    infinitives: [{ pointed: 'לְדַבֵּר', unpointed: 'לדבר' }],
    presents: ['מְדַבֵּר'],
    futures: ['יְדַבֵּר'],
    prepositions: [],
  },
};

const gadol: DictionaryCandidate = {
  id: 52,
  title: 'גדול',
  pointed: 'גָּדוֹל',
  wiktionaryPartOfSpeech: 'adj',
  definitions: ['big, large'],
  roots: ['ג־ד־ל'],
  partOfSpeech: 'adjective',
  adjective: {
    feminineSingulars: ['גְּדוֹלָה'],
    masculinePlurals: ['גְּדוֹלִים'],
    femininePlurals: ['גְּדוֹלוֹת'],
  },
};

const kelevNoun = {
  gender: 'm',
  pluralOnly: false,
  plural: 'כְּלָבִים',
  feminine: 'כַּלְבָּה',
  femininePlural: 'כְּלָבוֹת',
} as const;

// What the human typed before picking.
const typed: CardInputsDraft = { ...emptyDraft(), word: 'כלבים', definitions: ['dog'] };

describe('prefillDraft', () => {
  describe('for a noun', () => {
    test('fills the word, its gender and its forms, and keeps the meaning', () => {
      expect(prefillDraft(typed, kelev)).toEqual({
        draft: {
          word: 'כלב',
          pointed: 'כֶּלֶב',
          definitions: ['dog'],
          partOfSpeech: 'noun',
          root: '',
          noun: kelevNoun,
          verb: typed.verb,
          adjective: typed.adjective,
        },
        choices: {},
      });
    });

    describe('with two plurals', () => {
      test('leaves the plural blank and offers both', () => {
        const { draft, choices } = prefillDraft(typed, {
          ...kelev,
          noun: { ...kelev.noun, plurals: ['שָׁנִים', 'שָׁנוֹת'] },
        });
        expect(draft.noun.plural).toBe('');
        expect(choices).toEqual({ plural: ['שָׁנִים', 'שָׁנוֹת'] });
      });
    });

    describe('with a root', () => {
      test('fills it', () => {
        expect(prefillDraft(typed, { ...kelev, roots: ['כ־ל־ב'] }).draft.root).toBe('כ־ל־ב');
      });
    });

    describe('with two roots, like a blend', () => {
      test('leaves the root blank and offers both', () => {
        const roots = ['ק־ו־ל', 'ר־ו־ם'];
        const { draft, choices } = prefillDraft(typed, { ...kelev, roots });
        expect(draft.root).toBe('');
        expect(choices).toEqual({ root: roots });
      });
    });

    describe('without a root', () => {
      test('clears the root typed before', () => {
        expect(prefillDraft({ ...typed, root: 'כ־ל־ב' }, kelev).draft.root).toBe('');
      });
    });

    describe('without a gender the deck has', () => {
      test('leaves the gender unchosen and the forms blank', () => {
        expect(
          prefillDraft(typed, {
            ...kelev,
            noun: { gender: undefined, plurals: [], feminineSingulars: [], femininePlurals: [] },
          }).draft.noun,
        ).toEqual({
          gender: undefined,
          pluralOnly: false,
          plural: '',
          feminine: '',
          femininePlural: '',
        });
      });
    });

    describe('that is only plural', () => {
      test('checks only plural', () => {
        expect(
          prefillDraft(typed, {
            ...kelev,
            noun: { ...kelev.noun, gender: { gender: 'm', pluralOnly: true } },
          }).draft.noun,
        ).toEqual({ ...kelevNoun, pluralOnly: true });
      });
    });

    describe('with two feminines and two feminine plurals', () => {
      test('leaves both blank and offers each pair', () => {
        const feminineSingulars = ['חֲתוּלָה', 'חֲתֻלָּה'];
        const femininePlurals = ['חֲתוּלוֹת', 'חֲתֻלּוֹת'];
        const { draft, choices } = prefillDraft(typed, {
          ...kelev,
          noun: { ...kelev.noun, feminineSingulars, femininePlurals },
        });
        expect([draft.noun.feminine, draft.noun.femininePlural]).toEqual(['', '']);
        expect(choices).toEqual({ feminine: feminineSingulars, femininePlural: femininePlurals });
      });
    });

    describe('without a pointed spelling', () => {
      test('leaves the pointed word blank', () => {
        expect(prefillDraft(typed, { ...kelev, pointed: undefined }).draft.pointed).toBe('');
      });
    });
  });

  describe('for a verb', () => {
    test('fills the infinitive, binyan, forms and root, and keeps the preposition chosen', () => {
      const draft = { ...typed, verb: { ...typed.verb, preposition: 'עם' as const } };
      expect(prefillDraft(draft, diber)).toEqual({
        draft: {
          ...typed,
          word: 'לדבר',
          pointed: 'לְדַבֵּר',
          partOfSpeech: 'verb',
          root: 'ד־ב־ר',
          verb: {
            binyan: "pi'el",
            preposition: 'עם',
            past: 'דִּבֵּר',
            present: 'מְדַבֵּר',
            future: 'יְדַבֵּר',
          },
        },
        choices: {},
      });
    });

    describe('with two infinitives', () => {
      test('leaves both spellings blank and offers both infinitives', () => {
        const infinitives = [
          { pointed: 'לַחֲדֹר', unpointed: 'לחדור' },
          { pointed: 'לַחְדֹּר', unpointed: 'לחדור' },
        ];
        const { draft, choices } = prefillDraft(typed, {
          ...diber,
          verb: { ...diber.verb, infinitives },
        });
        expect([draft.word, draft.pointed]).toEqual(['', '']);
        expect(choices).toEqual({ infinitives });
      });
    });

    describe('without an infinitive, like a pu’al', () => {
      test('leaves both spellings blank', () => {
        const { draft } = prefillDraft(typed, {
          ...diber,
          verb: { ...diber.verb, infinitives: [] },
        });
        expect([draft.word, draft.pointed]).toEqual(['', '']);
      });
    });

    describe('with an infinitive the dictionary gives only pointed', () => {
      test('leaves the unpointed word blank', () => {
        const { draft } = prefillDraft(typed, {
          ...diber,
          verb: { ...diber.verb, infinitives: [{ pointed: 'לְדַבֵּר' }] },
        });
        expect([draft.word, draft.pointed]).toEqual(['', 'לְדַבֵּר']);
      });

      test('keeps the spelling typed, if it is this infinitive', () => {
        const { draft } = prefillDraft(
          { ...typed, word: 'לטייל ' },
          { ...diber, verb: { ...diber.verb, infinitives: [{ pointed: 'לְטַיֵּל' }] } },
        );
        expect([draft.word, draft.pointed]).toEqual(['לטייל', 'לְטַיֵּל']);
      });
    });

    describe('with a binyan the deck lacks', () => {
      test('unchooses the binyan chosen', () => {
        const draft = { ...typed, verb: { ...typed.verb, binyan: "pi'el" as const } };
        expect(
          prefillDraft(draft, { ...diber, verb: { ...diber.verb, binyan: undefined } }).draft.verb
            .binyan,
        ).toBeUndefined();
      });
    });

    describe('with two presents and two futures', () => {
      test('leaves each blank and offers both', () => {
        const presents = ['מֵנִיחַ', 'מַנִּיחַ'];
        const futures = ['יָנִיחַ', 'יַנִּיחַ'];
        const { draft, choices } = prefillDraft(typed, {
          ...diber,
          verb: { ...diber.verb, presents, futures },
        });
        expect(draft.verb).toMatchObject({ present: '', future: '' });
        expect(choices).toEqual({ present: presents, future: futures });
      });
    });

    describe('without a pointed lemma or a conjugation table', () => {
      test('leaves every form blank', () => {
        const { draft } = prefillDraft(typed, {
          ...diber,
          pointed: undefined,
          verb: { ...diber.verb, presents: [], futures: [] },
        });
        expect(draft.verb).toMatchObject({ past: '', present: '', future: '' });
      });
    });

    describe('with two roots', () => {
      test('leaves the root blank and offers both', () => {
        const { draft, choices } = prefillDraft(typed, { ...diber, roots: ['ד־ב־ר', 'ד־ב־ב'] });
        expect(draft.root).toBe('');
        expect(choices).toEqual({ root: ['ד־ב־ר', 'ד־ב־ב'] });
      });
    });
  });

  describe('for an adjective', () => {
    test('fills the word and its forms, and keeps the meaning', () => {
      expect(prefillDraft(typed, gadol)).toEqual({
        draft: {
          ...typed,
          word: 'גדול',
          pointed: 'גָּדוֹל',
          partOfSpeech: 'adjective',
          root: 'ג־ד־ל',
          adjective: {
            feminine: 'גְּדוֹלָה',
            masculinePlural: 'גְּדוֹלִים',
            femininePlural: 'גְּדוֹלוֹת',
          },
        },
        choices: {},
      });
    });

    describe('with two masculine plurals', () => {
      test('leaves that form blank and offers both', () => {
        const masculinePlurals = ['יִשְׂרְאֵלִים', 'יִשְׂרְאֵלִיִּים'];
        const { draft, choices } = prefillDraft(typed, {
          ...gadol,
          adjective: { ...gadol.adjective, masculinePlurals },
        });
        expect(draft.adjective.masculinePlural).toBe('');
        expect(choices).toEqual({ masculinePlural: masculinePlurals });
      });
    });

    describe('with two roots', () => {
      test('leaves the root blank and offers both', () => {
        const roots = ['ג־ד־ל', 'ג־ד־ד'];
        const { draft, choices } = prefillDraft(typed, { ...gadol, roots });
        expect(draft.root).toBe('');
        expect(choices).toEqual({ root: roots });
      });
    });

    describe('without forms', () => {
      test('leaves them blank', () => {
        expect(
          prefillDraft(typed, {
            ...gadol,
            adjective: { feminineSingulars: [], masculinePlurals: [], femininePlurals: [] },
          }).draft.adjective,
        ).toEqual({ feminine: '', masculinePlural: '', femininePlural: '' });
      });
    });
  });

  describe('for another part of speech', () => {
    test.each([
      ['name', 'other', 'כלב', 'כָּלֵב'],
      ['adv', 'adverb', 'מהר', 'מַהֵר'],
      ['prep', 'preposition', 'חוץ מ־', 'חוּץ מִ־'],
      ['intj', 'phrase', 'תודה', 'תּוֹדָה'],
    ] as const)(
      'fills only the word of a %s, as %s',
      (wiktionaryPartOfSpeech, partOfSpeech, title, pointed) => {
        expect(
          prefillDraft(typed, {
            id: 2,
            title,
            pointed,
            wiktionaryPartOfSpeech,
            definitions: [],
            roots: [],
            partOfSpeech,
          }),
        ).toEqual({ draft: { ...typed, word: title, pointed, partOfSpeech }, choices: {} });
      },
    );
  });
});

describe('prefillBlanks', () => {
  // The deck's כלב note, which holds every form the entry gives but no part of speech.
  const held = draftFromNote(loadedNote('כלב').fields).inputs;

  test('fills only what the note leaves blank', () => {
    const blankPlural = { ...held, noun: { ...held.noun, plural: '' } };
    expect(prefillBlanks(blankPlural, kelev)).toEqual({
      draft: { ...held, partOfSpeech: 'noun' },
      choices: {},
    });
  });

  test("keeps what the note holds, offering the entry's value where it differs", () => {
    const oldFormat = { ...held, pointed: '(ms) כֶּלֶב', root: 'כ־ל־ב' };
    expect(prefillBlanks(oldFormat, kelev)).toEqual({
      draft: { ...oldFormat, partOfSpeech: 'noun' },
      choices: { pointed: ['כֶּלֶב'] },
    });
  });

  test("keeps the part of speech, gender and word the note holds, offering the entry's", () => {
    const note = {
      ...held,
      word: 'כלבים',
      partOfSpeech: 'adjective' as const,
      noun: { ...held.noun, gender: 'f' as const, pluralOnly: true },
    };
    expect(prefillBlanks(note, kelev)).toEqual({
      draft: note,
      choices: { word: ['כלב'], partOfSpeech: ['noun'], gender: ['m'] },
    });
  });

  describe('with two plurals', () => {
    test("keeps the note's plural and offers both", () => {
      const plurals = ['שָׁנִים', 'שָׁנוֹת'];
      const { draft, choices } = prefillBlanks(held, {
        ...kelev,
        noun: { ...kelev.noun, plurals },
      });
      expect(draft.noun.plural).toBe('כְּלָבִים');
      expect(choices).toEqual({ plural: plurals });
    });
  });

  describe('for a verb filed under its past', () => {
    test('keeps the word, and offers the infinitive', () => {
      const past = { ...emptyDraft(), word: 'דיבר', pointed: 'דִּבֵּר' };
      const { draft, choices } = prefillBlanks(past, diber);
      expect([draft.word, draft.pointed, draft.verb.past]).toEqual(['דיבר', 'דִּבֵּר', 'דִּבֵּר']);
      expect(choices).toEqual({ infinitives: diber.verb.infinitives });
    });

    test("keeps the note's binyan, offering the entry's", () => {
      const note = {
        ...emptyDraft(),
        word: 'לדבר',
        verb: { ...emptyDraft().verb, binyan: "pa'al" as const },
      };
      const { draft, choices } = prefillBlanks(note, diber);
      expect(draft.verb.binyan).toBe("pa'al");
      expect(choices.binyan).toEqual(["pi'el"]);
    });
  });
});

describe('undoPrefill', () => {
  test('puts back every input the entry filled, and keeps the rest', () => {
    const before: CardInputsDraft = {
      ...typed,
      pointed: 'כְּלָבִים',
      verb: { ...typed.verb, preposition: 'עם', future: 'יְדַבֵּר' },
    };
    const filled = prefillDraft(before, diber).draft;
    const edited = {
      ...filled,
      definitions: ['to speak'],
      verb: { ...filled.verb, preposition: 'על' as const },
    };
    expect(undoPrefill(edited, before)).toEqual({
      ...before,
      definitions: ['to speak'],
      verb: { ...before.verb, preposition: 'על' },
    });
  });

  describe('for an adjective', () => {
    test('puts back the forms typed before', () => {
      const before: CardInputsDraft = {
        ...typed,
        adjective: { ...typed.adjective, feminine: 'טוֹבָה' },
      };
      expect(undoPrefill(prefillDraft(before, gadol).draft, before)).toEqual(before);
    });

    test('puts back the root typed before', () => {
      const before: CardInputsDraft = { ...typed, root: 'ג.ד.ל' };
      expect(undoPrefill(prefillDraft(before, gadol).draft, before).root).toBe('ג.ד.ל');
    });
  });
});

describe('stillSpellsEntry', () => {
  test.each([
    ['אווירון', 'אוירון', true],
    ['שלחן', 'שולחן', true],
    ['כל', 'כלב', false],
    ['חתול', 'כלב', false],
    ['ל', '', true],
  ])('answers %s typed over %j with %s', (word, filledWord, expected) => {
    expect(stillSpellsEntry(word, filledWord)).toBe(expected);
  });
});
