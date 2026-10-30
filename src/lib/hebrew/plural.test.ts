import { describe, expect, test } from 'vitest';
import { irregularPlural } from './plural.ts';

describe('irregularPlural', () => {
  describe('for a regular plural', () => {
    test.each([
      ['כֶּלֶב', 'כְּלָבִים', 'm'],
      ['דֶּלֶת', 'דְּלָתוֹת', 'f'],
      ['חָתוּל', 'חֲתוּלִים', 'm'],
      ['מוֹרֶה', 'מוֹרִים', 'm'],
      ['מֶלֶךְ', 'מְלָכִים', 'm'],
      ['חֲנוּת', 'חֲנֻיּוֹת', 'f'],
      ['סֶנְדְוִיץ׳', 'סֶנְדְוִיצִ׳ים', 'm'],
      ['כַּרְטִיס אַשְׁרַאי', 'כַּרְטִיסֵי אַשְׁרַאי', 'm'],
      ['רוּחַ', 'רוּחוֹת', 'mf'],
      ['שְׁנַת־לִמּוּדִים', 'שְׁנוֹת־לִמּוּדִים', 'f'],
    ] as const)('passes %s → %s', (singular, plural, gender) => {
      expect(irregularPlural({ singular, plural, gender })).toBeUndefined();
    });

    describe('that writes out a vowel the singular leaves unwritten', () => {
      test.each([
        ['כְּתֹבֶת', 'כְּתוֹבוֹת', 'f'],
        ['טְרֵפָה', 'טְרֵיפוֹת', 'f'],
        ['שֹׁד', 'שׁוֹדִים', 'm'],
        ['אָחוֹת', 'אֲחָיוֹת', 'f'],
      ] as const)('passes %s → %s', (singular, plural, gender) => {
        expect(irregularPlural({ singular, plural, gender })).toBeUndefined();
      });
    });

    describe('that shortens a shuruk to a qubuts', () => {
      test.each([
        ['עוּגָה', 'עֻגוֹת', 'f'],
        ['נוּסָח', 'נֻסָּחִים', 'm'],
      ] as const)('passes %s → %s', (singular, plural, gender) => {
        expect(irregularPlural({ singular, plural, gender })).toBeUndefined();
      });
    });

    describe('of an Aramaic loan ending in א', () => {
      test.each([
        ['סָבְתָא', 'סָבְתוֹת', 'f'],
        ['סַבָּא', 'סַבִּים', 'm'],
      ] as const)('passes %s → %s', (singular, plural, gender) => {
        expect(irregularPlural({ singular, plural, gender })).toBeUndefined();
      });
    });

    describe('of a singular with a direction control', () => {
      test('passes it', () => {
        expect(
          irregularPlural({ singular: 'פִּטְדָה\u202C', plural: 'פִּטְדוֹת', gender: 'f' }),
        ).toBeUndefined();
      });
    });
  });

  describe('for a masculine noun whose plural ends in ות', () => {
    test.each([
      ['אָב', 'אָבוֹת'],
      ['שֻׁלְחָן', 'שֻׁלְחָנוֹת'],
    ])('flags %s → %s', (singular, plural) => {
      expect(irregularPlural({ singular, plural, gender: 'm' })).toBe('masculine-with-ot');
    });
  });

  describe('for a feminine noun whose plural ends in ים', () => {
    test.each([
      ['שָׁנָה', 'שָׁנִים'],
      ['עִיר', 'עָרִים'],
      ['עַיִן', 'עֵינַיִם'],
    ])('flags %s → %s', (singular, plural) => {
      expect(irregularPlural({ singular, plural, gender: 'f' })).toBe('feminine-with-im');
    });
  });

  describe('for a plural that changes the stem', () => {
    test.each([
      ['בַּיִת', 'בָּתִּים', 'm'],
      ['יוֹם', 'יָמִים', 'm'],
      ['אִישׁ', 'אֲנָשִׁים', 'm'],
      ['בֵּית סֵפֶר', 'בָּתֵּי סֵפֶר', 'm'],
      ['עִיר', 'עָרִים', 'mf'],
      ['יוֹם־הֻלֶּדֶת', 'יְמֵי הֻלֶּדֶת', 'm'],
    ] as const)('flags %s → %s', (singular, plural, gender) => {
      expect(irregularPlural({ singular, plural, gender })).toBe('changed-stem');
    });

    // What the stem check can't tell from `יוֹם` → `יָמִים`.
    describe('that only drops a vowel letter the singular writes out', () => {
      test.each([
        ['עוֹרֵב', 'עֹרְבִים'],
        ['אֵיבוּס', 'אֵבוּסִים'],
      ])('still flags %s → %s', (singular, plural) => {
        expect(irregularPlural({ singular, plural, gender: 'm' })).toBe('changed-stem');
      });
    });
  });

  describe('while either form is blank', () => {
    test.each([
      ['', 'כְּלָבִים'],
      ['כֶּלֶב', ' '],
    ])('flags nothing for %j → %j', (singular, plural) => {
      expect(irregularPlural({ singular, plural, gender: 'm' })).toBeUndefined();
    });
  });
});
