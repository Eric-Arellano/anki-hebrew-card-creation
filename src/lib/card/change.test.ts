import { describe, expect, test } from 'vitest';
import { attachmentsChange, examplesChange, listChange, textChange } from './change.ts';

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

describe('examplesChange', () => {
  const barks = { hebrew: 'הַכֶּלֶב נוֹבֵחַ', english: 'The dog barks' };

  test('leaves out blank rows', () => {
    expect(examplesChange([barks], [barks, { hebrew: ' ', english: '' }])).toBeUndefined();
  });

  test('writes the rows it held compactly', () => {
    expect(examplesChange([barks], [{ ...barks, english: 'The dog is barking' }])).toEqual({
      kind: 'changed',
      was: 'הַכֶּלֶב נוֹבֵחַ — The dog barks',
    });
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
