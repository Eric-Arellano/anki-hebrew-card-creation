import { describe, expect, test } from 'vitest';
import { isSamePointedText, toComparisonKey } from './normalize.ts';

describe('toComparisonKey', () => {
  test('strips points', () => {
    expect(toComparisonKey('כֶּלֶב')).toBe('כלב');
    expect(toComparisonKey('לְדַבֵּר')).toBe('לדבר');
  });

  test('strips cantillation', () => {
    // Bereshit 1:1's first word, with its tipcha.
    expect(toComparisonKey(`בְּרֵאשִׁ${String.fromCodePoint(0x596)}ית`)).toBe('בראשית');
  });

  test('keeps the maqaf', () => {
    expect(toComparisonKey('ד־ב־ר')).toBe('ד־ב־ר');
  });

  test('folds geresh and gershayim with their ASCII stand-ins', () => {
    expect(toComparisonKey("ג'ירפה")).toBe('ג׳ירפה');
    expect(toComparisonKey('ג’ירפה')).toBe('ג׳ירפה');
    expect(toComparisonKey('צה"ל')).toBe('צה״ל');
    expect(toComparisonKey('צה״ל')).toBe('צה״ל');
  });

  test('collapses whitespace and &nbsp;', () => {
    expect(toComparisonKey('  בית&nbsp;ספר ')).toBe('בית ספר');
    expect(toComparisonKey(`בית${String.fromCodePoint(0xa0)}\t ספר`)).toBe('בית ספר');
  });

  test('leaves an empty string empty', () => {
    expect(toComparisonKey(' ')).toBe('');
  });
});

describe('isSamePointedText', () => {
  // בָּ with its qamats and dagesh in either order.
  const qamatsFirst = String.fromCodePoint(0x5d1, 0x5b8, 0x5bc);
  const dageshFirst = String.fromCodePoint(0x5d1, 0x5bc, 0x5b8);

  test('ignores the order of combining marks', () => {
    expect(qamatsFirst).not.toBe(dageshFirst);
    expect(isSamePointedText(qamatsFirst, dageshFirst)).toBe(true);
  });

  test('tells different points apart', () => {
    expect(isSamePointedText('טוֹב', 'טוּב')).toBe(false);
  });
});
