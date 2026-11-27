import { describe, expect, test } from 'vitest';
import { POINTED_PREPOSITIONS, withoutTrailingMaqaf } from './preposition.ts';

describe('withoutTrailingMaqaf', () => {
  test.each([
    ['ל־', 'ל'],
    ['חוץ מ־', 'חוץ מ'],
    ['ל-', 'ל'],
    ['עם', 'עם'],
    ['על־פי', 'על־פי'],
  ])('turns %s into %s', (word, expected) => {
    expect(withoutTrailingMaqaf(word)).toBe(expected);
  });
});

describe('POINTED_PREPOSITIONS', () => {
  test.each(Object.values(POINTED_PREPOSITIONS))('holds %s in NFC', (pointed) => {
    expect(pointed).toBe(pointed.normalize('NFC'));
  });
});
