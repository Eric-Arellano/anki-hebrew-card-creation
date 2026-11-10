import { describe, expect, test } from 'vitest';
import { type FormLine, formsByLabel, formsHtml } from './forms.ts';

describe('formsByLabel', () => {
  test('reads what formsHtml writes', () => {
    const lines: FormLine[] = [
      ['f', 'כַּלְבָּה'],
      ['m.pl', 'כְּלָבִים & co'],
    ];
    expect([...formsByLabel(formsHtml(lines))]).toEqual(lines);
  });

  test('reads a line Anki’s editor spaced with &nbsp;', () => {
    expect(formsByLabel('f:&nbsp;חֲתוּלָה').get('f')).toBe('חֲתוּלָה');
  });

  test('leaves out a line with no label', () => {
    expect([...formsByLabel('כְּלָבִים<br>pl: דָּגִים')]).toEqual([['pl', 'דָּגִים']]);
  });

  test('keeps the first of a label given twice', () => {
    expect(formsByLabel('pl: דָּגִים<br>pl: דָּגוֹת').get('pl')).toBe('דָּגִים');
  });

  test('is empty for a blank field', () => {
    expect(formsByLabel('').size).toBe(0);
  });
});
