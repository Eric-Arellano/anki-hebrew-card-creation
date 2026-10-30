import { describe, expect, test } from 'vitest';
import {
  hasNiqqud,
  includesPointedText,
  isSamePointedText,
  toComparisonKey,
  toDefectiveKey,
  toLookupKey,
  withoutDirectionControls,
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

  test('strips direction controls', () => {
    expect(toComparisonKey('\u202Bהַרְשָׁאָה\u202C\u200F')).toBe('הרשאה');
  });

  test('leaves an empty string empty', () => {
    expect(toComparisonKey(' ')).toBe('');
  });
});

describe('withoutDirectionControls', () => {
  test.each([
    ['an embedding', '\u202Bסקיני ג׳ינס\u202C', 'סקיני ג׳ינס'],
    ['an override', '\u202Eיָשְׁפֵה\u202C', 'יָשְׁפֵה'],
    ['an isolate', '\u2067זָוִית חַדָּה\u2069', 'זָוִית חַדָּה'],
    ['a mark', '\u200Fכֶּלֶב\u200E\u061C', 'כֶּלֶב'],
  ])('strips %s and keeps the points', (_, text, stripped) => {
    expect(withoutDirectionControls(text)).toBe(stripped);
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

  test.each(['בֵּית־קָפֶה', 'בית קפה', 'בית-קפה', 'בֵּית ־קָפֶה'])(
    'joins the words of %s with a space',
    (compound) => {
      expect(toLookupKey(compound)).toBe('בית קפה');
    },
  );
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

  test('counts a word after a maqaf as a word of its own', () => {
    expect(toDefectiveKey('בית־ויטמין')).toBe('בת וטמן');
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

describe('includesPointedText', () => {
  // בָּ with its qamats and dagesh in either order.
  const qamatsFirst = String.fromCodePoint(0x5d1, 0x5b8, 0x5bc);
  const dageshFirst = String.fromCodePoint(0x5d1, 0x5bc, 0x5b8);

  test('ignores the order of combining marks', () => {
    expect(includesPointedText(`${qamatsFirst}תִּים טוֹבִים`, `${dageshFirst}תִּים`)).toBe(true);
  });

  test('tells different points apart', () => {
    expect(includesPointedText('שָׁנִים טוֹבוֹת', 'שָׁנוֹת')).toBe(false);
  });
});
