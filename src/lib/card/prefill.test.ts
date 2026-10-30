import { describe, expect, test } from 'vitest';
import type { DictionaryCandidate } from '#lib/api.ts';
import { type CardInputsDraft, emptyDraft } from './inputs.ts';
import { prefillDraft } from './prefill.ts';

// As the lookup answers for the fixture dictionary.
const kelev: DictionaryCandidate = {
  id: 1,
  title: 'כלב',
  pointed: 'כֶּלֶב',
  pos: 'noun',
  glosses: ['dog'],
  roots: [],
  partOfSpeech: 'noun',
  noun: {
    gender: { gender: 'm', pluralOnly: false },
    plurals: ['כְּלָבִים'],
    feminines: ['כַּלְבָּה'],
    femininePlurals: ['כְּלָבוֹת'],
  },
};

const diber: DictionaryCandidate = {
  id: 30,
  title: 'דיבר',
  pointed: 'דִּבֵּר',
  pos: 'verb',
  glosses: ['to speak (say words)'],
  roots: ['ד־ב־ר'],
  partOfSpeech: 'verb',
  verb: {
    binyan: "pi'el",
    infinitives: [{ pointed: 'לְדַבֵּר', unpointed: 'לדבר' }],
    prepositions: [],
  },
};

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
          noun: {
            gender: 'm',
            pluralOnly: false,
            plural: 'כְּלָבִים',
            feminine: 'כַּלְבָּה',
            femininePlural: 'כְּלָבוֹת',
          },
          verb: typed.verb,
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

    describe('without a gender the deck has', () => {
      test('leaves the gender unchosen and the forms blank', () => {
        expect(
          prefillDraft(typed, {
            ...kelev,
            noun: { gender: undefined, plurals: [], feminines: [], femininePlurals: [] },
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
        ).toMatchObject({ gender: 'm', pluralOnly: true });
      });
    });
  });

  describe('for a verb', () => {
    test('fills the infinitive, binyan and root, and keeps the preposition chosen', () => {
      const draft = { ...typed, verb: { binyan: undefined, root: '', preposition: 'עם' as const } };
      expect(prefillDraft(draft, diber)).toEqual({
        draft: {
          ...typed,
          word: 'לדבר',
          pointed: 'לְדַבֵּר',
          partOfSpeech: 'verb',
          verb: { binyan: "pi'el", root: 'ד־ב־ר', preposition: 'עם' },
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
    });

    describe('with two roots', () => {
      test('leaves the root blank and offers both', () => {
        const { draft, choices } = prefillDraft(typed, { ...diber, roots: ['ד־ב־ר', 'ד־ב־ב'] });
        expect(draft.verb.root).toBe('');
        expect(choices).toEqual({ root: ['ד־ב־ר', 'ד־ב־ב'] });
      });
    });
  });

  describe('for another part of speech', () => {
    test('fills only the word', () => {
      expect(
        prefillDraft(typed, {
          id: 2,
          title: 'כלב',
          pointed: 'כָּלֵב',
          pos: 'name',
          glosses: ['a male given name, Caleb'],
          roots: [],
          partOfSpeech: 'other',
        }),
      ).toEqual({
        draft: { ...typed, word: 'כלב', pointed: 'כָּלֵב', partOfSpeech: 'other' },
        choices: {},
      });
    });
  });
});
