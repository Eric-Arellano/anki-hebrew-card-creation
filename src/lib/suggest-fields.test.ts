import { describe, expect, test } from 'vitest';
import type { CardInputs } from './card-inputs.ts';
import { suggestFields } from './suggest-fields.ts';

const dagInputs: CardInputs = {
  word: 'דג',
  partOfSpeech: 'other',
  definitions: ['fish'],
  pointed: 'דָּג',
};

describe('suggestFields', () => {
  describe('for a word that is neither a noun nor a verb', () => {
    test('fills the word, its pointed form, its definition and its production answer', () => {
      expect(suggestFields(dagInputs)).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish',
        productionAnswer: 'דג',
      });
    });
  });

  describe.each(['noun', 'verb'] as const)('for a %s', (partOfSpeech) => {
    test('leaves the production answer blank', () => {
      expect(suggestFields({ ...dagInputs, partOfSpeech })).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish',
        productionAnswer: '',
      });
    });
  });

  describe('with several meanings', () => {
    test('numbers them, one per line', () => {
      expect(
        suggestFields({ ...dagInputs, definitions: ['fish', 'Pisces & co'] }).definitions,
      ).toBe('1. fish<br>2. Pisces &amp; co');
    });
  });

  describe('when the inputs need cleaning', () => {
    test('trims them and escapes HTML', () => {
      expect(
        suggestFields({
          word: ' דג ',
          partOfSpeech: 'other',
          definitions: ['fish & chips'],
          pointed: ' דָּג ',
        }),
      ).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish &amp; chips',
        productionAnswer: 'דג',
      });
    });
  });

  describe('when the inputs are blank', () => {
    test('suggests blank fields', () => {
      expect(
        suggestFields({ word: '', partOfSpeech: 'other', definitions: [''], pointed: '' }),
      ).toEqual({
        unpointed: '',
        pointed: '',
        definitions: '',
        productionAnswer: '',
      });
    });
  });
});
