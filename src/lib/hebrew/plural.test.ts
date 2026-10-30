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
    ] as const)('passes %s → %s', (singular, plural, gender) => {
      expect(irregularPlural({ singular, plural, gender })).toBeUndefined();
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
    ] as const)('flags %s → %s', (singular, plural, gender) => {
      expect(irregularPlural({ singular, plural, gender })).toBe('changed-stem');
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
