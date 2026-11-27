import { describe, expect, test } from 'vitest';
import { GOVERNED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import {
  completeVerbDefinitions,
  definitionsFromHtml,
  definitionsToAnkiFieldHtml,
  type Meaning,
} from './definitions.ts';

const LISHMOR_HTML =
  '1. to keep, save <span class="prep"><bdi lang="he">אֶת</bdi></span>' +
  '<br>2. to guard, look after <span class="prep"><bdi lang="he">עַל</bdi></span>';

describe('definitionsToAnkiFieldHtml', () => {
  describe('for a meaning with no preposition chosen', () => {
    test('writes the English alone, escaped', () => {
      expect(definitionsToAnkiFieldHtml([{ english: 'fish & chips' }])).toBe('fish &amp; chips');
    });
  });

  describe('for a meaning that takes a preposition', () => {
    test('ends it in a pill of the pointed preposition', () => {
      expect(definitionsToAnkiFieldHtml([{ english: 'to help', preposition: 'ל' }])).toBe(
        'to help <span class="prep"><bdi lang="he">לְ־</bdi></span>',
      );
    });
  });

  describe('for a meaning that takes none', () => {
    test('ends it in an empty marker', () => {
      expect(definitionsToAnkiFieldHtml([{ english: 'to go', preposition: 'none' }])).toBe(
        'to go<span class="no-prep"></span>',
      );
    });
  });

  describe('for several meanings', () => {
    test('numbers them, each with its own preposition', () => {
      expect(
        definitionsToAnkiFieldHtml([
          { english: 'to keep, save', preposition: 'את' },
          { english: 'to guard, look after', preposition: 'על' },
        ]),
      ).toBe(LISHMOR_HTML);
    });
  });
});

describe('definitionsFromHtml', () => {
  test.each<[string, Meaning[]]>([
    ['one meaning with none', [{ english: 'to go', preposition: 'none' }]],
    ['one meaning with one', [{ english: 'to wait', preposition: 'ל' }]],
    [
      'several meanings',
      [
        { english: 'to talk with', preposition: 'עם' },
        { english: 'to talk about', preposition: 'על' },
        { english: 'to speak', preposition: 'none' },
      ],
    ],
    ['English with its own parentheses', [{ english: '(computing) to save', preposition: 'את' }]],
    ['a meaning with nothing chosen', [{ english: 'fish & chips' }]],
  ])('reads back %s as composition wrote it', (_, meanings) => {
    const [first, ...rest] = meanings;
    if (first === undefined) throw new Error('No meanings');
    expect(definitionsFromHtml(definitionsToAnkiFieldHtml([first, ...rest]))).toStrictEqual(
      meanings,
    );
  });

  test.each(GOVERNED_PREPOSITIONS)('reads back %s', (preposition) => {
    expect(
      definitionsFromHtml(definitionsToAnkiFieldHtml([{ english: 'x', preposition }])),
    ).toEqual([{ english: 'x', preposition }]);
  });

  describe('with a pill whose marks are in another order', () => {
    test('still reads its preposition', () => {
      // בּ then ְ, where NFC puts the sheva first.
      const html = 'to believe <span class="prep"><bdi lang="he">בְּ־</bdi></span>';
      expect(definitionsFromHtml(html)).toEqual([{ english: 'to believe', preposition: 'ב' }]);
    });
  });

  describe('with a pill no chip offers', () => {
    test('leaves it in the English, unchosen', () => {
      expect(
        definitionsFromHtml('to turn <span class="prep"><bdi lang="he">אֶל</bdi></span>'),
      ).toStrictEqual([{ english: 'to turn אֶל' }]);
    });
  });
});

describe('completeVerbDefinitions', () => {
  describe('while a filled meaning’s preposition is unchosen', () => {
    test('returns nothing', () => {
      expect(
        completeVerbDefinitions([
          { english: 'to keep', preposition: 'את' },
          { english: 'to guard' },
        ]),
      ).toBeUndefined();
    });
  });

  describe('while every meaning is blank', () => {
    test('returns nothing', () => {
      expect(completeVerbDefinitions([{ english: ' ', preposition: 'את' }])).toBeUndefined();
    });
  });
});
