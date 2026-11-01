import { describe, expect, test } from 'vitest';
import { BINYANIM, toBinyan } from './binyan.ts';

describe('toBinyan', () => {
  test.each(BINYANIM)('names %s by its own name', (binyan) => {
    expect(toBinyan(binyan)).toBe(binyan);
  });

  test.each([
    ['paal', "pa'al"],
    ['qal', "pa'al"],
    ['kal', "pa'al"],
    ['pa', "pa'al"],
    ['nifal', "nif'al"],
    ['nif', "nif'al"],
    ['piel', "pi'el"],
    ['pi', "pi'el"],
    ['pual', "pu'al"],
    ['pu', "pu'al"],
    ['hifil', "hif'il"],
    ['hif', "hif'il"],
    ["hof'al", "huf'al"],
    ['hufal', "huf'al"],
    ['hofal', "huf'al"],
    ['huf', "huf'al"],
    ['hitpael', "hitpa'el"],
    ['hit', "hitpa'el"],
  ])('converts the alias %s to %s', (alias, binyan) => {
    expect(toBinyan(alias)).toBe(binyan);
  });

  test('ignores case, padding and a curly apostrophe', () => {
    expect(toBinyan(' Pi’el ')).toBe("pi'el");
  });

  describe('for a binyan the deck lacks', () => {
    test.each(["hitpu'al", "nitpa'el"])('converts %s to nothing', (code) => {
      expect(toBinyan(code)).toBeUndefined();
    });
  });

  describe('for a name on the object prototype', () => {
    test('converts it to nothing', () => {
      expect(toBinyan('constructor')).toBeUndefined();
    });
  });
});
