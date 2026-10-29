import { describe, expect, test } from 'vitest';
import { type CardInputs, completeInputs, missingInputs } from './card-inputs.ts';

const dagInputs: CardInputs = { word: 'דג', partOfSpeech: 'other', gloss: 'fish', pointed: 'דָּג' };

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
