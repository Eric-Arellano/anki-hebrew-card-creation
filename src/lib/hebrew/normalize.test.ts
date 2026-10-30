import { describe, expect, test } from 'vitest';
import {
  hasNiqqud,
  isSamePointedText,
  toComparisonKey,
  toDefectiveKey,
  toLookupKey,
} from './normalize.ts';

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

describe('hasNiqqud', () => {
  test.each([
    ['כֶּלֶב', true],
    ['כלב', false],
    ['ד־ב־ר', false],
  ])('answers %s with %s', (text, expected) => {
    expect(hasNiqqud(text)).toBe(expected);
  });
});

describe('toLookupKey', () => {
  test('strips points like a comparison key', () => {
    expect(toLookupKey(' שֻׁלְחָן ')).toBe('שלחן');
  });

  test('drops a maqaf at either end', () => {
    expect(toLookupKey('שְׁנַת־')).toBe('שנת');
    expect(toLookupKey('לְ־')).toBe('ל');
  });

  test('keeps a maqaf inside', () => {
    expect(toLookupKey('ד־ב־ר')).toBe('ד־ב־ר');
  });
});

describe('toDefectiveKey', () => {
  test('gives ktiv male and ktiv haser one key', () => {
    expect(toDefectiveKey('שולחן')).toBe('שלחן');
    expect(toDefectiveKey('שֻׁלְחָן')).toBe('שלחן');
    expect(toDefectiveKey('עיניים')).toBe(toDefectiveKey('עֵינַיִם'));
  });

  test('keeps ו and י at the start and end of each word', () => {
    expect(toDefectiveKey('ויקרא ילדי')).toBe('וקרא ילדי');
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
