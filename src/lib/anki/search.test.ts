import { describe, expect, test } from 'vitest';
import { fieldContainsKey, noteIdsAre, noteTypeIs, quote } from './search.ts';

describe('quote', () => {
  test('wraps a term in double quotes', () => {
    expect(quote('deck:עברית')).toBe('"deck:עברית"');
  });
});

describe('noteTypeIs', () => {
  test('quotes a name with spaces', () => {
    expect(noteTypeIs('Basic (and reversed card) Spanish')).toBe(
      '"note:Basic (and reversed card) Spanish"',
    );
  });

  test('escapes the characters special inside quotes', () => {
    expect(noteTypeIs('a\\b"c*d_e')).toBe('"note:a\\\\b\\"c\\*d\\_e"');
  });
});

describe('fieldContainsKey', () => {
  test('searches for the key anywhere in the field', () => {
    expect(fieldContainsKey('Hebrew', 'כלב')).toBe('"Hebrew:*כלב*"');
  });

  test('quotes a field name with spaces', () => {
    expect(fieldContainsKey('Production answer', 'כלב')).toBe('"Production answer:*כלב*"');
  });

  test('lets a space match any gap', () => {
    expect(fieldContainsKey('Hebrew', 'בית ספר')).toBe('"Hebrew:*בית*ספר*"');
  });

  test('lets geresh and gershayim match any one character', () => {
    expect(fieldContainsKey('Hebrew', 'ג׳ירפה')).toBe('"Hebrew:*ג_ירפה*"');
    expect(fieldContainsKey('Hebrew', 'צה״ל')).toBe('"Hebrew:*צה_ל*"');
  });

  test('escapes the characters special inside quotes', () => {
    expect(fieldContainsKey('My_field', 'a*b"c\\d_e')).toBe('"My\\_field:*a\\*b\\"c\\\\d\\_e*"');
  });
});

describe('noteIdsAre', () => {
  test('joins ids with commas', () => {
    expect(noteIdsAre([1751686072898, 1751714132957])).toBe('nid:1751686072898,1751714132957');
  });
});
