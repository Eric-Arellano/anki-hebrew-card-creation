import { describe, expect, test } from 'vitest';
import { attachmentsChange, listChange, removedRows, textChange } from './changed-from.ts';

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

describe('listChange', () => {
  function joined(values: readonly string[]) {
    return values.join('; ');
  }

  test('finds nothing to compare without a held list', () => {
    expect(listChange(undefined, ['dog'], joined)).toBeUndefined();
  });

  test('finds no change in the same items', () => {
    expect(listChange(['dog', 'hound'], ['dog', 'hound'], joined)).toBeUndefined();
  });

  test('finds no change between two empty lists', () => {
    expect(listChange([], [], joined)).toBeUndefined();
  });

  test('calls items in an empty list added', () => {
    expect(listChange([], ['dog'], joined)).toEqual({ kind: 'added' });
  });

  test('calls an emptied list cleared, describing what it held', () => {
    expect(listChange(['dog', 'hound'], [], joined)).toEqual({
      kind: 'cleared',
      was: 'dog; hound',
    });
  });

  test('calls a reordered list changed', () => {
    expect(listChange(['dog', 'hound'], ['hound', 'dog'], joined)).toEqual({
      kind: 'changed',
      was: 'dog; hound',
    });
  });

  test('calls a longer list changed', () => {
    expect(listChange(['dog'], ['dog', 'hound'], joined)).toEqual({ kind: 'changed', was: 'dog' });
  });
});

describe('removedRows', () => {
  function isBlank(row: string) {
    return row.trim() === '';
  }

  test('finds none without held rows', () => {
    expect(removedRows(undefined, ['dog'], isBlank)).toEqual([]);
  });

  test('finds the held rows past the end, with their indexes, leaving out blanks', () => {
    expect(removedRows(['dog', 'hound', '', 'cur'], ['dog'], isBlank)).toEqual([
      { index: 1, row: 'hound' },
      { index: 3, row: 'cur' },
    ]);
  });

  test('finds none while every held row has a row at its index', () => {
    expect(removedRows(['dog'], ['hound', 'cur'], isBlank)).toEqual([]);
  });
});

describe('attachmentsChange', () => {
  const stored = { kind: 'stored', filename: 'pronunciation_he_כלב.mp3' } as const;

  test('finds no change in the same filenames', () => {
    expect(attachmentsChange([stored], [{ ...stored }], 'recording')).toBeUndefined();
  });

  test('counts what it held', () => {
    expect(attachmentsChange([stored, stored], [], 'image')).toEqual({
      kind: 'cleared',
      was: '2 images',
    });
  });
});
