import { describe, expect, test } from 'vitest';
import {
  quoteSearchTerm,
  searchByFieldContainingKey,
  searchByFieldHavingPhrase,
  searchByNoteIds,
  searchByNoteType,
  searchForAny,
} from './search.ts';

describe('quoteSearchTerm', () => {
  test('wraps a term in double quotes', () => {
    expect(quoteSearchTerm('deck:עברית')).toBe('"deck:עברית"');
  });
});

describe('searchByNoteType', () => {
  test('quotes a name with spaces', () => {
    expect(searchByNoteType('Basic (and reversed card)')).toBe('"note:Basic (and reversed card)"');
  });

  test('escapes the characters special inside quotes', () => {
    expect(searchByNoteType('a\\b"c*d_e')).toBe('"note:a\\\\b\\"c\\*d\\_e"');
  });
});

describe('searchByFieldHavingPhrase', () => {
  test('searches for the phrase between word edges', () => {
    expect(searchByFieldHavingPhrase('Definitions', 'car')).toBe(
      String.raw`"Definitions:re:\bcar\b"`,
    );
  });

  test('lets any spaces or `&nbsp;` part its words', () => {
    expect(searchByFieldHavingPhrase('Definitions', 'to  go')).toBe(
      String.raw`"Definitions:re:\bto(\s|&nbsp;)+go\b"`,
    );
  });

  test('escapes what is special to a regex, and a quote', () => {
    expect(searchByFieldHavingPhrase('Definitions', 'e.g. (a|b)*"\\')).toBe(
      String.raw`"Definitions:re:\be\.g\.(\s|&nbsp;)+\(a\|b\)\*\"\\\b"`,
    );
  });

  test('escapes a field name as any search does', () => {
    expect(searchByFieldHavingPhrase('My_field', 'car')).toBe(String.raw`"My\_field:re:\bcar\b"`);
  });
});

describe('searchByFieldContainingKey', () => {
  test('searches for the key anywhere in the field', () => {
    expect(searchByFieldContainingKey('Hebrew', 'כלב')).toBe('"Hebrew:*כלב*"');
  });

  test('quotes a field name with spaces', () => {
    expect(searchByFieldContainingKey('Production answer', 'כלב')).toBe(
      '"Production answer:*כלב*"',
    );
  });

  test('lets a space match any gap', () => {
    expect(searchByFieldContainingKey('Hebrew', 'בית ספר')).toBe('"Hebrew:*בית*ספר*"');
  });

  test('lets geresh and gershayim match any one character', () => {
    expect(searchByFieldContainingKey('Hebrew', 'ג׳ירפה')).toBe('"Hebrew:*ג_ירפה*"');
    expect(searchByFieldContainingKey('Hebrew', 'צה״ל')).toBe('"Hebrew:*צה_ל*"');
  });

  test('escapes the characters special inside quotes', () => {
    expect(searchByFieldContainingKey('My_field', 'a*b"c\\d_e')).toBe(
      '"My\\_field:*a\\*b\\"c\\\\d\\_e*"',
    );
  });
});

describe('searchByNoteIds', () => {
  test('joins ids with commas', () => {
    expect(searchByNoteIds([1751686072898, 1751714132957])).toBe('nid:1751686072898,1751714132957');
  });
});

describe('searchForAny', () => {
  test('joins terms with OR, grouped', () => {
    expect(searchForAny(['"a"', '"b"'])).toBe('("a" OR "b")');
  });

  describe('for one term', () => {
    test('leaves it as it is', () => {
      expect(searchForAny(['"a"'])).toBe('"a"');
    });
  });
});
