import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { FIELD_NAMES, shownFieldGroups, toAnkiFields } from './note-type.ts';

const answersAndContext = [
  { group: 'Answers', fields: ['productionAnswer', 'definitions'] },
  { group: 'Context', fields: ['productionContext', 'readingContext'] },
];
const variantsAndExtras = [
  {
    group: 'Variants',
    fields: ['variant1Prompt', 'variant1Answer', 'variant2Prompt', 'variant2Answer'],
  },
  { group: 'Extras', fields: ['examples', 'notes'] },
];

describe('shownFieldGroups', () => {
  describe('for a noun', () => {
    test('shows gender and forms, but not binyan or root', () => {
      expect(shownFieldGroups(fieldNames, 'noun')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fields: ['gender', 'forms'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for a verb', () => {
    test('shows binyan and root, but not gender or forms', () => {
      expect(shownFieldGroups(fieldNames, 'verb')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fields: ['binyan', 'root'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for any other word', () => {
    test('shows forms only', () => {
      expect(shownFieldGroups(fieldNames, 'other')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fields: ['forms'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('when Anki orders fields differently', () => {
    test('keeps its order within a group', () => {
      expect(shownFieldGroups(['Notes', 'Definitions', 'Examples'], 'noun')).toEqual([
        { group: 'Answers', fields: ['definitions'] },
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
