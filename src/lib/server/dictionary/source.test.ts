import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DICTIONARY_FIXTURE } from '#tests/dictionary-index.ts';
import { readEntry } from './source.ts';

const lines = readFileSync(DICTIONARY_FIXTURE, 'utf8')
  .split('\n')
  .filter((line) => line !== '')
  .map((line) => JSON.parse(line) as { word: string; pos: string });

function fixtureLine(word: string, pos: string) {
  const line = lines.find((other) => other.word === word && other.pos === pos);
  if (line === undefined) throw new Error(`The fixture has no ${pos} ${word}`);
  return line;
}

function entry(word: string, pos: string) {
  const read = readEntry(fixtureLine(word, pos));
  if (read === undefined) throw new Error(`Couldn't read the ${pos} ${word}`);
  return read;
}

describe('readEntry', () => {
  test('takes each gloss from its raw form, and none from an alt-of sense', () => {
    expect(entry('אדרבא', 'adv').facts).toMatchObject({
      glosses: ['(Ashkenazi) by all means, definitely'],
      altOf: ['אַדְּרַבָּה'],
    });
  });

  describe('for a canonical form wrapped in a direction control', () => {
    test('drops the control from its pointed spelling and its keys', () => {
      const { pointed, keyForms } = entry('הרשאה', 'noun');
      expect(pointed).toBe('הַרְשָׁאָה');
      expect(keyForms).toEqual(['הרשאה', 'הַרְשָׁאָה']);
    });
  });

  describe('for a canonical form without niqqud', () => {
    test('gives no pointed spelling', () => {
      expect(entry('שמים', 'noun').pointed).toBeUndefined();
    });
  });

  describe('for a canonical form wiktextract split', () => {
    test.each([
      ['at a maqaf', 'כדור רגל', 'noun', 'כַּדּוּר־רֶגֶל'],
      ['after a prefix', 'בדרך כלל', 'adv', 'בְּדֶרֶךְ־כְּלָל'],
    ])('takes the head template’s spelling %s', (_, word, pos, pointed) => {
      expect(entry(word, pos).pointed).toBe(pointed);
    });
  });

  describe('for a canonical form followed by something that isn’t Hebrew', () => {
    test('takes the head template’s spelling', () => {
      expect(entry('רקד', 'verb').pointed).toBe('רָקַד');
    });
  });

  describe('for a head that gives the title and then its pointing', () => {
    test('takes the pointing alone', () => {
      expect(entry('בינתיים', 'adv').pointed).toBe('בֵּינְתַיִם');
    });
  });

  describe('for a plural wiktextract split inside a word', () => {
    test('takes the head template’s spelling', () => {
      expect(entry('כאב ראש', 'noun').facts.plurals).toEqual(['כְּאֵבֵי רֹאשׁ']);
    });
  });

  describe('for an infinitive filed as a verb of its own', () => {
    test('is no lemma', () => {
      expect(entry('לדעת', 'verb').isLemma).toBe(false);
    });
  });

  describe('for an infinitive whose link leaves out a י that ktiv male writes', () => {
    test('gives it no unpointed spelling', () => {
      expect(entry('נשאר', 'verb').facts.infinitives).toEqual([{ pointed: 'לְהִשָּׁאֵר' }]);
    });
  });

  describe('for a blend', () => {
    test('takes both roots', () => {
      expect(entry('רמקול', 'noun').facts.roots).toEqual(['ק־ו־ל', 'ר־ו־ם']);
    });
  });

  describe('for a conjugation stem that is not the root', () => {
    test('keeps the rootbox apart from it', () => {
      const { facts, conjugationRoots } = entry('הוציא', 'verb');
      expect(facts.roots).toEqual(['י־צ־א']);
      expect(conjugationRoots).toEqual(['ו־צ־א']);
    });
  });

  describe('for a conjugation stem split across arguments', () => {
    test('takes no root from it', () => {
      expect(entry('טלגרף', 'verb').conjugationRoots).toEqual([]);
    });
  });

  describe('for a root category with a sense label', () => {
    test('drops the label and the shin dot', () => {
      expect(entry('חירשות', 'noun').categoryRoots).toEqual(['ח־ר־ש']);
    });
  });

  describe('for an infinitive the table spells two ways unpointed', () => {
    test('gives it no unpointed spelling', () => {
      expect(entry('נשר', 'verb').facts.infinitives).toEqual([{ pointed: 'לִנְשֹׁר' }]);
    });
  });

  describe('for a head template naming infinitives without ל', () => {
    test('takes the table’s infinitive instead', () => {
      expect(entry('גווע', 'verb').facts.infinitives).toEqual([
        { pointed: 'לִגְוֺעַ', unpointed: 'לגווע' },
      ]);
    });
  });

  describe('for an adjective with two masculine plurals', () => {
    test('takes both, and only its one feminine and feminine plural', () => {
      expect(entry('ישראלי', 'adj').facts).toMatchObject({
        feminines: ['יִשְׂרְאֵלִית'],
        masculinePlurals: ['יִשְׂרְאֵלִים', 'יִשְׂרְאֵלִיִּים'],
        femininePlurals: ['יִשְׂרְאֵלִיּוֹת'],
      });
    });
  });

  describe('for a line it can’t read', () => {
    test.each([
      ['one that isn’t JSON', undefined],
      ['one in another language', { ...fixtureLine('כלב', 'noun'), lang_code: 'yi' }],
      ['one without a word', { pos: 'noun', lang_code: 'he' }],
    ])('gives nothing for %s', (_, json) => {
      expect(readEntry(json)).toBeUndefined();
    });
  });
});
