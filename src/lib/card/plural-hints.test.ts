import { describe, expect, test } from 'vitest';
import type { NounDraft } from './noun.ts';
import { pluralHints } from './plural-hints.ts';

const shulchan: NounDraft = {
  gender: 'm',
  pluralOnly: false,
  plural: 'שֻׁלְחָנוֹת',
  feminine: '',
  femininePlural: '',
};

describe('pluralHints', () => {
  test('suggests an irregular plural, with the answer its gender agrees with', () => {
    expect(pluralHints(shulchan, 'שֻׁלְחָן')).toEqual([
      { plural: 'שֻׁלְחָנוֹת', reason: 'masculine-with-ot', answers: ['שֻׁלְחָנוֹת טוֹבִים'] },
    ]);
  });

  describe('for a regular plural', () => {
    test('suggests nothing', () => {
      expect(pluralHints({ ...shulchan, plural: 'כְּלָבִים' }, 'כֶּלֶב')).toEqual([]);
    });
  });

  describe('for a feminine counterpart with an irregular plural', () => {
    test('suggests it as feminine', () => {
      expect(
        pluralHints(
          { ...shulchan, plural: 'כְּלָבִים', feminine: 'כַּלְבָּה', femininePlural: 'כַּלְבִּים' },
          'כֶּלֶב',
        ),
      ).toEqual([{ plural: 'כַּלְבִּים', reason: 'feminine-with-im', answers: ['כַּלְבִּים טוֹבוֹת'] }]);
    });
  });

  describe('for a feminine noun', () => {
    test('ignores the counterpart typed under masculine', () => {
      expect(
        pluralHints({ ...shulchan, gender: 'f', plural: 'דְּלָתוֹת', femininePlural: 'שֻׁלְחָנִים' }, 'דֶּלֶת'),
      ).toEqual([]);
    });
  });

  describe('for a noun of both genders', () => {
    test('offers both answers', () => {
      expect(pluralHints({ ...shulchan, gender: 'mf', plural: 'עָרִים' }, 'עִיר')).toEqual([
        { plural: 'עָרִים', reason: 'changed-stem', answers: ['עָרִים טוֹבִים', 'עָרִים טוֹבוֹת'] },
      ]);
    });
  });

  describe('while the gender is unchosen', () => {
    test('suggests nothing', () => {
      expect(pluralHints({ ...shulchan, gender: undefined }, 'שֻׁלְחָן')).toEqual([]);
    });
  });

  describe('for a noun that is only plural', () => {
    test('suggests nothing', () => {
      expect(pluralHints({ ...shulchan, pluralOnly: true }, 'שֻׁלְחָן')).toEqual([]);
    });
  });
});
