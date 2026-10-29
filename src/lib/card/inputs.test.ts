import { describe, expect, test } from 'vitest';
import { type CardInputsDraft, completeInputs, missingInputs } from './inputs.ts';
import type { NounDraft } from './noun.ts';
import type { VerbDraft } from './verb.ts';

const noun: NounDraft = {
  gender: undefined,
  pluralOnly: false,
  plural: 'כְּלָבִים',
  feminine: 'כַּלְבָּה',
  femininePlural: 'כְּלָבוֹת',
};

const verb: VerbDraft = { binyan: "pi'el", root: 'ד.ב.ר', preposition: 'עם' };

const dagDraft: CardInputsDraft = {
  word: 'דג',
  partOfSpeech: 'other',
  definitions: ['fish'],
  pointed: 'דָּג',
  noun,
  verb,
};

const ledaberDraft: CardInputsDraft = {
  ...dagDraft,
  word: 'לדבר',
  partOfSpeech: 'verb',
  definitions: ['to speak'],
  pointed: 'לְדַבֵּר',
};

describe('missingInputs', () => {
  test('lists the blank inputs in the order the editor shows them', () => {
    expect(
      missingInputs({ ...dagDraft, pointed: ' ', definitions: [''], partOfSpeech: undefined }),
    ).toEqual(['definitions', 'partOfSpeech', 'pointed']);
  });

  describe('when every input is filled', () => {
    test('lists none', () => {
      expect(missingInputs(dagDraft)).toEqual([]);
    });
  });

  describe('while every meaning is blank', () => {
    test('lists the meaning', () => {
      expect(missingInputs({ ...dagDraft, definitions: ['', ' '] })).toEqual(['definitions']);
    });
  });

  describe('for a noun', () => {
    test('requires a gender', () => {
      expect(missingInputs({ ...dagDraft, partOfSpeech: 'noun' })).toEqual(['gender']);
    });

    test('lists the gender before the pointed word, as the editor shows them', () => {
      expect(missingInputs({ ...dagDraft, partOfSpeech: 'noun', pointed: '' })).toEqual([
        'gender',
        'pointed',
      ]);
    });
  });

  describe('for a verb', () => {
    test('requires a preposition before the pointed word, and a binyan and root after it', () => {
      expect(
        missingInputs({
          ...ledaberDraft,
          pointed: '',
          verb: { binyan: undefined, root: '', preposition: undefined },
        }),
      ).toEqual(['preposition', 'pointed', 'binyan', 'root']);
    });

    test('counts a root that is not only letters as missing', () => {
      expect(missingInputs({ ...ledaberDraft, verb: { ...verb, root: 'דִּבֵּר' } })).toEqual(['root']);
    });
  });
});

describe('completeInputs', () => {
  test('returns the inputs once every one is filled', () => {
    expect(completeInputs(dagDraft)).toEqual({
      word: 'דג',
      partOfSpeech: 'other',
      definitions: ['fish'],
      pointed: 'דָּג',
    });
  });

  describe('with blank and padded meanings', () => {
    test('keeps the filled ones, trimmed', () => {
      expect(completeInputs({ ...dagDraft, definitions: ['', ' fish ', ' ', 'Pisces'] })).toEqual({
        word: 'דג',
        partOfSpeech: 'other',
        definitions: ['fish', 'Pisces'],
        pointed: 'דָּג',
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
        definitions: ['fish'],
        pointed: 'דָּג',
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
        definitions: ['fish'],
        pointed: 'דָּג',
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
        definitions: ['fish'],
        pointed: 'דָּג',
        noun: { pluralOnly: true, gender: 'm' },
      });
    });
  });

  describe('for a verb', () => {
    test('returns its preposition, binyan and root, joined with maqafs', () => {
      expect(completeInputs(ledaberDraft)).toEqual({
        word: 'לדבר',
        partOfSpeech: 'verb',
        definitions: ['to speak'],
        pointed: 'לְדַבֵּר',
        verb: { binyan: "pi'el", root: 'ד־ב־ר', preposition: 'עם' },
      });
    });
  });

  describe('for a verb that takes no preposition', () => {
    test('returns no preposition', () => {
      expect(
        completeInputs({ ...ledaberDraft, verb: { ...verb, preposition: 'none' } }),
      ).toMatchObject({ verb: { preposition: undefined } });
    });
  });

  describe('for a verb while its preposition is unchosen', () => {
    test('returns nothing', () => {
      expect(
        completeInputs({ ...ledaberDraft, verb: { ...verb, preposition: undefined } }),
      ).toBeUndefined();
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
      expect(completeInputs({ ...dagDraft, definitions: [' '] })).toBeUndefined();
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
