import { describe, expect, test } from 'vitest';
import { productionTov } from './tov.ts';

describe('productionTov', () => {
  describe('for a noun with a singular', () => {
    test.each([
      ['m', 'טוב'],
      ['f', 'טובה'],
      ['mf', 'טוב'],
    ] as const)('answers %s with %s', (gender, tov) => {
      expect(productionTov({ gender, pluralOnly: false })).toBe(tov);
    });
  });

  describe('for a noun that is only plural', () => {
    test.each([
      ['m', 'טובים'],
      ['f', 'טובות'],
      ['mf', 'טובים'],
    ] as const)('answers %s with %s', (gender, tov) => {
      expect(productionTov({ gender, pluralOnly: true })).toBe(tov);
    });
  });
});
