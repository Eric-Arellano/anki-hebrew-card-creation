import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { FIELD_NAMES, quotedParts, shownFieldGroups, toAnkiFields } from './note-type.ts';

const context = { group: 'Disambiguation hints', fields: ['productionContext', 'readingContext'] };
const variantsAndExtras = [
  {
    group: 'Unusual variants',
    fields: ['variant1Prompt', 'variant1Answer', 'variant2Prompt', 'variant2Answer'],
  },
  { group: 'Extras', fields: ['examples', 'notes'] },
];

describe('shownFieldGroups', () => {
  describe('for a noun', () => {
    test('shows neither the fields its inputs write nor binyan or root', () => {
      expect(shownFieldGroups(fieldNames, 'noun')).toEqual([context, ...variantsAndExtras]);
    });
  });

  describe('for a verb', () => {
    test('shows binyan and root, but not forms', () => {
      expect(shownFieldGroups(fieldNames, 'verb')).toEqual([
        { group: 'Grammar', fields: ['binyan', 'root'] },
        context,
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for any other word', () => {
    test('shows forms only', () => {
      expect(shownFieldGroups(fieldNames, 'other')).toEqual([
        { group: 'Grammar', fields: ['forms'] },
        context,
        ...variantsAndExtras,
      ]);
    });
  });

  describe('when Anki orders fields differently', () => {
    test('keeps its order within a group', () => {
      expect(shownFieldGroups(['Notes', 'Reading context', 'Examples'], 'noun')).toEqual([
        { group: 'Disambiguation hints', fields: ['readingContext'] },
        { group: 'Extras', fields: ['notes', 'examples'] },
      ]);
    });
  });

  describe('when Anki has a field note-type.ts does not name', () => {
    test('leaves it out', () => {
      expect(shownFieldGroups(['Notes', 'Comments'], 'noun')).toEqual([
        { group: 'Extras', fields: ['notes'] },
      ]);
    });
  });
});

describe('toAnkiFields', () => {
  test('names every field as Anki does, blank where there is no value', () => {
    expect(toAnkiFields((key) => (key === 'definitions' ? 'fish' : undefined))).toEqual({
      ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
      Definitions: 'fish',
    });
  });
});

describe('FIELD_NAMES', () => {
  // Two keys naming one field would make composition a guess about which one it fills.
  test('names each field once', () => {
    expect(new Set(FIELD_NAMES).size).toBe(FIELD_NAMES.length);
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
