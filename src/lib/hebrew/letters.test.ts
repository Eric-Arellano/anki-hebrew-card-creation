import { describe, expect, test } from 'vitest';
import { hasHebrewLetters, hasLatinLetters } from './letters.ts';

describe('hasHebrewLetters', () => {
  test('finds a letter, final forms included', () => {
    expect(hasHebrewLetters('a book, not ספר')).toBe(true);
    expect(hasHebrewLetters('ך')).toBe(true);
  });

  test('ignores points and punctuation alone', () => {
    expect(hasHebrewLetters('ְּ ־ ׳')).toBe(false);
    expect(hasHebrewLetters('a book')).toBe(false);
  });
});

describe('hasLatinLetters', () => {
  test('finds a letter in either case', () => {
    expect(hasLatinLetters('קראתי Book')).toBe(true);
  });

  test('ignores Hebrew, digits and punctuation', () => {
    expect(hasLatinLetters('קראתי 3 ספרים, ב־2020')).toBe(false);
  });
});
