import { describe, expect, test } from 'vitest';
import { productionTov } from './tov.ts';

describe('productionTov', () => {
  test.each([
    ['m', 'טוב'],
    ['f', 'טובה'],
    ['mf', 'טוב'],
  ] as const)('answers %s with %s', (gender, tov) => {
    expect(productionTov(gender)).toBe(tov);
  });
});
