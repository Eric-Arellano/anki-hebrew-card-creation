import { describe, expect, test } from 'vitest';
import { samePointed, toKey } from './normalize.ts';

describe('toKey', () => {
  test('strips points', () => {
    expect(toKey('כֶּלֶב')).toBe('כלב');
    expect(toKey('לְדַבֵּר')).toBe('לדבר');
  });

  test('strips cantillation', () => {
    // Bereshit 1:1's first word, with its tipcha.
    expect(toKey(`בְּרֵאשִׁ${String.fromCodePoint(0x596)}ית`)).toBe('בראשית');
  });

  test('keeps the maqaf', () => {
    expect(toKey('ד־ב־ר')).toBe('ד־ב־ר');
  });

  test('folds geresh and gershayim with their ASCII stand-ins', () => {
    expect(toKey("ג'ירפה")).toBe('ג׳ירפה');
    expect(toKey('ג’ירפה')).toBe('ג׳ירפה');
    expect(toKey('צה"ל')).toBe('צה״ל');
    expect(toKey('צה״ל')).toBe('צה״ל');
  });

  test('collapses whitespace and &nbsp;', () => {
    expect(toKey('  בית&nbsp;ספר ')).toBe('בית ספר');
    expect(toKey(`בית${String.fromCodePoint(0xa0)}\t ספר`)).toBe('בית ספר');
  });

  test('leaves an empty string empty', () => {
    expect(toKey(' ')).toBe('');
  });
});

describe('samePointed', () => {
  // בָּ with its qamats and dagesh in either order.
  const qamatsFirst = String.fromCodePoint(0x5d1, 0x5b8, 0x5bc);
  const dageshFirst = String.fromCodePoint(0x5d1, 0x5bc, 0x5b8);

  test('ignores the order of combining marks', () => {
    expect(qamatsFirst).not.toBe(dageshFirst);
    expect(samePointed(qamatsFirst, dageshFirst)).toBe(true);
  });

  test('tells different points apart', () => {
    expect(samePointed('טוֹב', 'טוּב')).toBe(false);
  });
});
