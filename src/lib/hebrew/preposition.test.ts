import { describe, expect, test } from 'vitest';
import { withoutTrailingMaqaf } from './preposition.ts';

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
