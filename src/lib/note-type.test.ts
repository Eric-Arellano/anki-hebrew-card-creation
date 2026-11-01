import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { FIELD_NAMES, shownFieldGroups, toAnkiFields } from './note-type.ts';

const context = { group: 'Disambiguation hints', fields: ['productionContext', 'readingContext'] };
const extras = { group: 'Extras', fields: ['examples', 'notes'] };
const variantsAndExtras = [
  {
    group: 'Unusual variants',
    fields: ['variant1Prompt', 'variant1Answer', 'variant2Prompt', 'variant2Answer'],
  },
  extras,
];

describe('shownFieldGroups', () => {
  describe('for a noun', () => {
    test('shows none of the fields its inputs write', () => {
      expect(shownFieldGroups(fieldNames, 'noun')).toEqual([context, ...variantsAndExtras]);
    });
  });

  describe('for a verb', () => {
    test('shows none of the fields its inputs write, nor forms', () => {
      expect(shownFieldGroups(fieldNames, 'verb')).toEqual([context, ...variantsAndExtras]);
    });
  });

  describe('for an adjective', () => {
    test('shows variants but not forms, which its inputs write', () => {
      expect(shownFieldGroups(fieldNames, 'adjective')).toEqual([context, ...variantsAndExtras]);
    });
  });

  describe('for an adverb', () => {
    test('shows neither forms nor variants', () => {
      expect(shownFieldGroups(fieldNames, 'adverb')).toEqual([context, extras]);
    });
  });

  describe('for a preposition', () => {
    test('shows forms and variants', () => {
      expect(shownFieldGroups(fieldNames, 'preposition')).toEqual([
        { group: 'Grammar', fields: ['forms'] },
        context,
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for a phrase', () => {
    test('shows variants but not forms', () => {
      expect(shownFieldGroups(fieldNames, 'phrase')).toEqual([context, ...variantsAndExtras]);
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
