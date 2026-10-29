import { describe, expect, test } from 'vitest';
import { type CardInputs, completeInputs, composeSuggestions, missingInputs } from './compose.ts';

const dagInputs: CardInputs = { word: 'דג', partOfSpeech: 'other', gloss: 'fish', pointed: 'דָּג' };

describe('composeSuggestions', () => {
  describe('for a word that is neither a noun nor a verb', () => {
    test('fills the word, its pointed form, its definition and its production answer', () => {
      expect(composeSuggestions(dagInputs)).toEqual({
        Hebrew: 'דג',
        Pointed: 'דָּג',
        Definitions: 'fish',
        'Production answer': 'דג',
      });
    });
  });

  describe.each(['noun', 'verb'] as const)('for a %s', (partOfSpeech) => {
    test('leaves the production answer blank', () => {
      expect(composeSuggestions({ ...dagInputs, partOfSpeech })).toEqual({
        Hebrew: 'דג',
        Pointed: 'דָּג',
        Definitions: 'fish',
        'Production answer': '',
      });
    });
  });

  describe('when the inputs need cleaning', () => {
    test('trims them and escapes HTML', () => {
      expect(
        composeSuggestions({
          word: ' דג ',
          partOfSpeech: 'other',
          gloss: ' fish & chips ',
          pointed: ' דָּג ',
        }),
      ).toEqual({
        Hebrew: 'דג',
        Pointed: 'דָּג',
        Definitions: 'fish &amp; chips',
        'Production answer': 'דג',
      });
    });
  });

  describe('when the inputs are blank', () => {
    test('suggests blank fields', () => {
      expect(
        composeSuggestions({ word: '', partOfSpeech: 'other', gloss: '', pointed: '' }),
      ).toEqual({ Hebrew: '', Pointed: '', Definitions: '', 'Production answer': '' });
    });
  });
});

describe('missingInputs', () => {
  test('lists the blank inputs in the order the editor shows them', () => {
    expect(missingInputs({ word: 'דג', pointed: ' ', gloss: '', partOfSpeech: undefined })).toEqual(
      ['pointed', 'gloss', 'partOfSpeech'],
    );
  });

  describe('when every input is filled', () => {
    test('lists none', () => {
      expect(missingInputs(dagInputs)).toEqual([]);
    });
  });
});

describe('completeInputs', () => {
  test('returns the inputs once every one is filled', () => {
    expect(completeInputs(dagInputs)).toEqual(dagInputs);
  });

  describe('while an input is blank', () => {
    test('returns nothing', () => {
      expect(completeInputs({ ...dagInputs, gloss: ' ' })).toBeUndefined();
    });
  });

  describe('while the part of speech is unchosen', () => {
    test('returns nothing', () => {
      expect(completeInputs({ ...dagInputs, partOfSpeech: undefined })).toBeUndefined();
    });
  });
});
