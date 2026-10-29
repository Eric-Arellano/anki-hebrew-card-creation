import { describe, expect, test } from 'vitest';
import { type CardInputsDraft, completeInputs, missingInputs } from './card-inputs.ts';

const dagDraft: CardInputsDraft = {
  word: 'דג',
  partOfSpeech: 'other',
  definitions: ['fish'],
  pointed: 'דָּג',
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
});
