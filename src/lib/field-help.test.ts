import { describe, expect, test } from 'vitest';
import { FIELD_HELP, fieldDisplay, quotedParts } from './field-help.ts';

describe('fieldDisplay', () => {
  test('gives a field the help for the part of speech', () => {
    expect(fieldDisplay('variant1Answer', 'verb')).toEqual({
      label: 'Variant 1: Hebrew answer, with niqqud',
      help: FIELD_HELP.variant1Answer.verb,
      searchesImages: undefined,
    });
  });

  describe('for a field with one help for every part of speech', () => {
    test('gives it that help', () => {
      expect(fieldDisplay('notes', 'noun').help).toBe(FIELD_HELP.notes);
    });
  });

  describe('for a field the editor never shows', () => {
    test('gives only its name', () => {
      expect(fieldDisplay('root', 'verb')).toEqual({ label: 'Root' });
    });
  });
});

describe('quotedParts', () => {
  test('splits out each quoted example', () => {
    expect(quotedParts('For example, “ד־ב־ר” for לְדַבֵּר, or “a b”.')).toEqual([
      { text: 'For example, ', quoted: false },
      { text: 'ד־ב־ר', quoted: true },
      { text: ' for לְדַבֵּר, or ', quoted: false },
      { text: 'a b', quoted: true },
      { text: '.', quoted: false },
    ]);
  });

  describe('when a quote starts the text', () => {
    test('leaves out the empty part before it', () => {
      expect(quotedParts('“a”')).toEqual([{ text: 'a', quoted: true }]);
    });
  });

  describe('without quotes', () => {
    test('returns the whole text', () => {
      expect(quotedParts('plain')).toEqual([{ text: 'plain', quoted: false }]);
    });
  });
});
