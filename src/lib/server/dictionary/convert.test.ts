import { describe, expect, test } from 'vitest';
import { governedPreposition, nounGender, partOfSpeechOf } from './convert.ts';

describe('partOfSpeechOf', () => {
  test.each([
    ['noun', 'noun'],
    ['verb', 'verb'],
    ['adj', 'other'],
    ['name', 'other'],
  ])('converts %s to %s', (pos, partOfSpeech) => {
    expect(partOfSpeechOf(pos)).toBe(partOfSpeech);
  });
});

describe('nounGender', () => {
  test.each([
    [['m'], { gender: 'm', pluralOnly: false }],
    [['f'], { gender: 'f', pluralOnly: false }],
    [['m', 'f'], { gender: 'mf', pluralOnly: false }],
    [['mf'], { gender: 'mf', pluralOnly: false }],
    [['f-s'], { gender: 'f', pluralOnly: false }],
    [['m-p'], { gender: 'm', pluralOnly: true }],
    [['m-d'], { gender: 'm', pluralOnly: true }],
    [['m-p', 'f-p'], { gender: 'mf', pluralOnly: true }],
  ])('converts %j', (codes, gender) => {
    expect(nounGender(codes)).toEqual(gender);
  });

  describe('when a code is unknown', () => {
    test.each([[[]], [['?']], [['p']], [['d-f']], [['m', '-']]])('gives none for %j', (codes) => {
      expect(nounGender(codes)).toBeUndefined();
    });
  });

  describe('when only one gender is only plural', () => {
    test('gives none', () => {
      expect(nounGender(['m', 'f-p'])).toBeUndefined();
    });
  });
});

describe('governedPreposition', () => {
  test.each([
    ['לְ־', 'ל'],
    ['ל־', 'ל'],
    ['בּ־', 'ב'],
    ['מִ־', 'מ'],
    ['עַל', 'על'],
    ['עם', 'עם'],
    ['אֵת', 'את'],
    ['direct', 'את'],
  ])('converts %s to %s', (text, preposition) => {
    expect(governedPreposition(text)).toBe(preposition);
  });

  describe('for one outside the list', () => {
    test.each(['אֶל', 'ש־', 'enclitic'])('suggests nothing for %s', (text) => {
      expect(governedPreposition(text)).toBeUndefined();
    });
  });
});
