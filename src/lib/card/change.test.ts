import { describe, expect, test } from 'vitest';
import { textChange } from './change.ts';

describe('textChange', () => {
  test('finds nothing to compare without a held value', () => {
    expect(textChange(undefined, 'כְּלָבִים')).toBeUndefined();
  });

  test('finds no change in the same text, however it is normalized', () => {
    // שָׁ with its qamats and shin dot in either order, which NFC puts in one.
    expect(textChange('שָׁ', 'שָׁ')).toBeUndefined();
  });

  test('finds no change between two blanks', () => {
    expect(textChange('', '  ')).toBeUndefined();
  });

  test('calls a value in a blank field added', () => {
    expect(textChange('', 'כְּלָבִים')).toEqual({ kind: 'added' });
  });

  test('calls a blanked value cleared, keeping what it was', () => {
    expect(textChange('כְּלָבִים', ' ')).toEqual({ kind: 'cleared', was: 'כְּלָבִים' });
  });

  test('calls another value changed, keeping what it was', () => {
    expect(textChange('כְּלָבִים', 'כְּלָבוֹת')).toEqual({ kind: 'changed', was: 'כְּלָבִים' });
  });
});
