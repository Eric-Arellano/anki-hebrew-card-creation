import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import { lookUp, withDictionary } from '#lib/server/dictionary/lookup.ts';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import { homographsOf } from './homographs.ts';

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

function lookupOf(word: string): DictionaryLookup {
  return withDictionary(index, (db, staleIndex) => lookUp(db, word, staleIndex));
}

describe('homographsOf', () => {
  test('lists the entries with the same spelling and other niqqud', () => {
    expect(homographsOf(lookupOf('ספר'), 'ספר', 'סֵפֶר')).toEqual([
      { pointed: 'סַפָּר', partOfSpeech: 'noun', definitions: ['barber'] },
      { pointed: 'סָפַר', partOfSpeech: 'verb', definitions: ['to count'] },
      { pointed: 'סְפָר', partOfSpeech: 'noun', definitions: ['border, frontier'] },
    ]);
  });

  test('compares the niqqud after NFC', () => {
    // סַפָּר with its dagesh before its qamats, the order NFC reverses.
    const barber = 'ס\u05B7פ\u05BC\u05B8ר';
    expect(homographsOf(lookupOf('ספר'), 'ספר', barber).map(({ pointed }) => pointed)).toEqual([
      'סֵפֶר',
      'סָפַר',
      'סְפָר',
    ]);
  });

  describe('when the note points its word another way than the dictionary', () => {
    test.each([
      ['with a meteg', 'ספר', 'סֵ\u05BDפֶר', ['סַפָּר', 'סָפַר', 'סְפָר']],
      ['without its vowel letter', 'גדול', 'גָּדֹל', []],
    ])('leaves out its own entry, pointed %s', (_, word, pointed, others) => {
      expect(homographsOf(lookupOf(word), word, pointed).map((other) => other.pointed)).toEqual(
        others,
      );
    });
  });

  describe('when the lookup reached an entry through its forms', () => {
    test('leaves it out', () => {
      expect(lookupOf('כלב').candidates.map(({ pointed }) => pointed)).toContain('כַּלְבָּה');
      expect(homographsOf(lookupOf('כלב'), 'כלב', 'כֶּלֶב')).toEqual([]);
    });

    test('leaves out a verb’s own entry, found by its infinitive', () => {
      expect(homographsOf(lookupOf('לדבר'), 'לדבר', 'לְדַבֵּר')).toEqual([]);
    });
  });

  describe('for a verb’s infinitive', () => {
    test('lists the other verb whose infinitive has its spelling, by that infinitive', () => {
      expect(homographsOf(lookupOf('לפנות'), 'לפנות', 'לִפְנוֹת')).toEqual([
        {
          pointed: 'לְפַנּוֹת',
          partOfSpeech: 'verb',
          definitions: ['(transitive) to clear (an area or space of someone or something)'],
        },
      ]);
      expect(
        homographsOf(lookupOf('לפנות'), 'לפנות', 'לְפַנּוֹת').map(({ pointed }) => pointed),
      ).toEqual(['לִפְנוֹת']);
    });

    test('leaves out a verb whose infinitive is spelled otherwise', () => {
      expect(lookupOf('לספר').candidates.map(({ pointed }) => pointed)).toEqual(['סָפַר']);
      expect(homographsOf(lookupOf('לספר'), 'לספר', 'לְסַפֵּר')).toEqual([]);
    });
  });

  describe('without niqqud for the note', () => {
    test('finds none', () => {
      expect(homographsOf(lookupOf('ספר'), 'ספר', ' ')).toEqual([]);
    });
  });

  describe('when the match is only possible', () => {
    test('finds none', () => {
      expect(homographsOf({ ...lookupOf('ספר'), match: 'possible' }, 'ספר', 'סֵפֶר')).toEqual([]);
    });
  });
});
