import { describe, expect, test } from 'vitest';
import type { AdjectiveInputs } from '#lib/card/parts-of-speech/adjective.ts';
import type { NounDraft } from '#lib/card/parts-of-speech/noun.ts';
import type { VerbDraft } from '#lib/card/parts-of-speech/verb.ts';
import { type CardInputsDraft, completeInputs, draftRoot, missingInputs } from './inputs.ts';

const noun: NounDraft = {
  gender: undefined,
  pluralOnly: false,
  plural: 'כְּלָבִים',
  feminine: 'כַּלְבָּה',
  femininePlural: 'כְּלָבוֹת',
};

const verb: VerbDraft = {
  binyan: "pi'el",
  past: 'דִּבֵּר',
  unpointedPast: 'דיבר',
  present: 'מְדַבֵּר',
  future: 'יְדַבֵּר',
};

const adjective: AdjectiveInputs = {
  feminine: 'גְּדוֹלָה',
  masculinePlural: 'גְּדוֹלִים',
  femininePlural: 'גְּדוֹלוֹת',
};

const dagDraft: CardInputsDraft = {
  word: 'דג',
  partOfSpeech: 'other',
  meanings: [{ english: 'fish' }],
  wordPointed: 'דָּג',
  root: 'ד.ב.ר',
  noun,
  verb,
  adjective,
};

const ledaberDraft: CardInputsDraft = {
  ...dagDraft,
  word: 'לדבר',
  partOfSpeech: 'verb',
  meanings: [{ english: 'to speak', preposition: 'עם' }],
  wordPointed: 'לְדַבֵּר',
};

describe('missingInputs', () => {
  test('lists the blank inputs in the order the editor shows them', () => {
    expect(
      missingInputs({
        ...dagDraft,
        wordPointed: ' ',
        meanings: [{ english: '' }],
        partOfSpeech: undefined,
      }),
    ).toEqual(['meanings', 'partOfSpeech', 'wordPointed']);
  });

  describe('when every input is filled', () => {
    test('lists none', () => {
      expect(missingInputs(dagDraft)).toEqual([]);
    });
  });

  describe('while every meaning is blank', () => {
    test('lists the meaning', () => {
      expect(missingInputs({ ...dagDraft, meanings: [{ english: '' }, { english: ' ' }] })).toEqual(
        ['meanings'],
      );
    });
  });

  describe('for a noun', () => {
    test('requires a gender', () => {
      expect(missingInputs({ ...dagDraft, partOfSpeech: 'noun' })).toEqual(['gender']);
    });

    test('lists the gender before the pointed word, as the editor shows them', () => {
      expect(missingInputs({ ...dagDraft, partOfSpeech: 'noun', wordPointed: '' })).toEqual([
        'gender',
        'wordPointed',
      ]);
    });
  });

  describe('for a verb', () => {
    test('requires a preposition before the pointed word, and a past and binyan after it', () => {
      expect(
        missingInputs({
          ...ledaberDraft,
          meanings: [{ english: 'to speak' }],
          wordPointed: '',
          root: '',
          verb: { ...verb, unpointedPast: ' ', binyan: undefined },
        }),
      ).toEqual(['preposition', 'wordPointed', 'unpointedPast', 'binyan']);
    });

    test("doesn't require a past for a binyan without an infinitive", () => {
      expect(
        missingInputs({ ...ledaberDraft, verb: { ...verb, binyan: "pu'al", unpointedPast: '' } }),
      ).toEqual([]);
    });

    test('requires a preposition for each meaning, but not for a blank one', () => {
      const meanings = [{ english: 'to speak', preposition: 'עם' as const }, { english: '' }];
      expect(missingInputs({ ...ledaberDraft, meanings })).toEqual([]);
      expect(
        missingInputs({ ...ledaberDraft, meanings: [...meanings, { english: 'to say' }] }),
      ).toEqual(['preposition']);
    });
  });

  describe.each(['noun', 'verb', 'adjective'] as const)('for a %s', (partOfSpeech) => {
    const draft = { ...ledaberDraft, partOfSpeech, noun: { ...noun, gender: 'm' as const } };

    test('allows a blank root', () => {
      expect(missingInputs({ ...draft, root: ' ' })).toEqual([]);
    });

    test('counts a root that is not only letters as missing', () => {
      expect(missingInputs({ ...draft, root: 'דִּבֵּר' })).toEqual(['root']);
    });
  });

  describe('for a part of speech that shows no root', () => {
    test('ignores one left over from another', () => {
      expect(missingInputs({ ...dagDraft, root: 'דִּבֵּר' })).toEqual([]);
    });
  });
});

describe('completeInputs', () => {
  test('returns the inputs once every one is filled', () => {
    expect(completeInputs(dagDraft)).toEqual({
      word: 'דג',
      partOfSpeech: 'other',
      meanings: [{ english: 'fish' }],
      wordPointed: 'דָּג',
    });
  });

  describe('with blank and padded meanings', () => {
    test('keeps the filled ones, trimmed', () => {
      expect(
        completeInputs({
          ...dagDraft,
          meanings: [
            { english: '' },
            { english: ' fish ' },
            { english: ' ' },
            { english: 'Pisces' },
          ],
        }),
      ).toEqual({
        word: 'דג',
        partOfSpeech: 'other',
        meanings: [{ english: 'fish' }, { english: 'Pisces' }],
        wordPointed: 'דָּג',
      });
    });
  });

  describe.each(['adverb', 'preposition', 'phrase'] as const)(
    'for a word of part of speech %s',
    (partOfSpeech) => {
      test('returns only the word and its meanings', () => {
        expect(completeInputs({ ...dagDraft, partOfSpeech })).toEqual({
          word: 'דג',
          partOfSpeech,
          meanings: [{ english: 'fish' }],
          wordPointed: 'דָּג',
        });
      });
    },
  );

  describe('for an adjective', () => {
    test('returns its forms', () => {
      expect(completeInputs({ ...dagDraft, partOfSpeech: 'adjective' })).toEqual({
        word: 'דג',
        partOfSpeech: 'adjective',
        meanings: [{ english: 'fish' }],
        wordPointed: 'דָּג',
        root: 'ד־ב־ר',
        adjective,
      });
    });
  });

  describe('for a masculine noun', () => {
    test('returns its feminine counterpart too', () => {
      expect(
        completeInputs({ ...dagDraft, partOfSpeech: 'noun', noun: { ...noun, gender: 'm' } }),
      ).toEqual({
        word: 'דג',
        partOfSpeech: 'noun',
        meanings: [{ english: 'fish' }],
        wordPointed: 'דָּג',
        root: 'ד־ב־ר',
        noun: { ...noun, gender: 'm' },
      });
    });
  });

  describe('for a feminine noun', () => {
    test('drops the feminine counterpart typed under masculine', () => {
      expect(
        completeInputs({ ...dagDraft, partOfSpeech: 'noun', noun: { ...noun, gender: 'f' } }),
      ).toEqual({
        word: 'דג',
        partOfSpeech: 'noun',
        meanings: [{ english: 'fish' }],
        wordPointed: 'דָּג',
        root: 'ד־ב־ר',
        noun: { pluralOnly: false, gender: 'f', plural: 'כְּלָבִים' },
      });
    });
  });

  describe('for a noun that is only plural', () => {
    test('drops every form', () => {
      expect(
        completeInputs({
          ...dagDraft,
          partOfSpeech: 'noun',
          noun: { ...noun, gender: 'm', pluralOnly: true },
        }),
      ).toEqual({
        word: 'דג',
        partOfSpeech: 'noun',
        meanings: [{ english: 'fish' }],
        wordPointed: 'דָּג',
        root: 'ד־ב־ר',
        noun: { pluralOnly: true, gender: 'm' },
      });
    });
  });

  describe('for a verb', () => {
    test('returns its prepositions, binyan, forms and root, joined with maqafs', () => {
      expect(completeInputs(ledaberDraft)).toEqual({
        word: 'לדבר',
        partOfSpeech: 'verb',
        meanings: [{ english: 'to speak', preposition: 'עם' }],
        wordPointed: 'לְדַבֵּר',
        root: 'ד־ב־ר',
        verb,
      });
    });
  });

  describe('for a verb with blank forms', () => {
    test('needs none of them', () => {
      expect(
        completeInputs({ ...ledaberDraft, verb: { ...verb, past: '', present: '', future: '' } }),
      ).toMatchObject({ verb: { past: '', present: '', future: '' } });
    });
  });

  describe('for a verb while its past without niqqud is blank', () => {
    test('returns nothing', () => {
      expect(
        completeInputs({ ...ledaberDraft, verb: { ...verb, unpointedPast: '' } }),
      ).toBeUndefined();
    });
  });

  describe("for a pu'al, which has no infinitive", () => {
    test('drops the past without niqqud', () => {
      const dubar = {
        ...ledaberDraft,
        word: 'דובר',
        wordPointed: 'דֻּבַּר',
        verb: { ...verb, binyan: "pu'al" as const, past: 'דֻּבַּר', present: '', future: '' },
      };
      expect(completeInputs(dubar)).toEqual({
        word: 'דובר',
        partOfSpeech: 'verb',
        meanings: [{ english: 'to speak', preposition: 'עם' }],
        wordPointed: 'דֻּבַּר',
        root: 'ד־ב־ר',
        verb: { binyan: "pu'al", past: 'דֻּבַּר', present: '', future: '' },
      });
    });
  });

  describe('for a verb with a blank root', () => {
    test('returns a blank root', () => {
      expect(completeInputs({ ...ledaberDraft, root: '' })).toMatchObject({ root: '' });
    });
  });

  describe('for a verb with meanings that take different prepositions, or none', () => {
    test('returns each meaning’s, leaving out a blank row', () => {
      expect(
        completeInputs({
          ...ledaberDraft,
          meanings: [
            { english: ' to talk with ', preposition: 'עם' },
            { english: '', preposition: 'את' },
            { english: 'to talk about', preposition: 'על' },
            { english: 'to speak', preposition: 'none' },
          ],
        })?.meanings,
      ).toEqual([
        { english: 'to talk with', preposition: 'עם' },
        { english: 'to talk about', preposition: 'על' },
        { english: 'to speak', preposition: 'none' },
      ]);
    });
  });

  describe('for a verb while a meaning’s preposition is unchosen', () => {
    test('returns nothing', () => {
      expect(
        completeInputs({
          ...ledaberDraft,
          meanings: [{ english: 'to speak', preposition: 'עם' }, { english: 'to say' }],
        }),
      ).toBeUndefined();
    });
  });

  describe('for a noun whose meanings kept prepositions from when it was a verb', () => {
    test('drops them', () => {
      expect(
        completeInputs({
          ...ledaberDraft,
          partOfSpeech: 'noun',
          noun: { ...noun, gender: 'm' },
        })?.meanings,
      ).toStrictEqual([{ english: 'to speak' }]);
    });
  });

  describe('for a verb while its binyan is unchosen', () => {
    test('returns nothing', () => {
      expect(
        completeInputs({ ...ledaberDraft, verb: { ...verb, binyan: undefined } }),
      ).toBeUndefined();
    });
  });

  describe('while an input is blank', () => {
    test('returns nothing', () => {
      expect(completeInputs({ ...dagDraft, meanings: [{ english: ' ' }] })).toBeUndefined();
    });
  });

  describe('while the part of speech is unchosen', () => {
    test('returns nothing', () => {
      expect(completeInputs({ ...dagDraft, partOfSpeech: undefined })).toBeUndefined();
    });
  });

  describe('for a noun while its gender is unchosen', () => {
    test('returns nothing', () => {
      expect(completeInputs({ ...dagDraft, partOfSpeech: 'noun' })).toBeUndefined();
    });
  });
});

describe('draftRoot', () => {
  describe.each(['noun', 'verb', 'adjective'] as const)('for a %s', (partOfSpeech) => {
    test('formats the typed root', () => {
      expect(draftRoot({ ...ledaberDraft, partOfSpeech })).toBe('ד־ב־ר');
    });

    test('has none while the root is blank or mistyped', () => {
      expect(draftRoot({ ...ledaberDraft, partOfSpeech, root: ' ' })).toBeUndefined();
      expect(draftRoot({ ...ledaberDraft, partOfSpeech, root: 'דִּבֵּר' })).toBeUndefined();
    });
  });

  describe('for a part of speech that shows no root', () => {
    test('ignores one left over from another', () => {
      expect(draftRoot(dagDraft)).toBeUndefined();
      expect(draftRoot({ ...dagDraft, partOfSpeech: undefined })).toBeUndefined();
    });
  });
});
