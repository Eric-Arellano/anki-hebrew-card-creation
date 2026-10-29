import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { FIELD_NAMES, shownFieldGroups } from './note-type.ts';

const answersAndContext = [
  { group: 'Answers', fieldNames: ['Production answer', 'Definitions'] },
  { group: 'Context', fieldNames: ['Production context', 'Reading context'] },
];
const variantsAndExtras = [
  {
    group: 'Variants',
    fieldNames: ['Variant 1 prompt', 'Variant 1 answer', 'Variant 2 prompt', 'Variant 2 answer'],
  },
  { group: 'Extras', fieldNames: ['Examples', 'Notes'] },
];

describe('shownFieldGroups', () => {
  describe('for a noun', () => {
    test('shows gender and forms, but not binyan or root', () => {
      expect(shownFieldGroups(fieldNames, 'noun')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fieldNames: ['Gender', 'Forms'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for a verb', () => {
    test('shows binyan and root, but not gender or forms', () => {
      expect(shownFieldGroups(fieldNames, 'verb')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fieldNames: ['Binyan', 'Root'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('for any other word', () => {
    test('shows forms only', () => {
      expect(shownFieldGroups(fieldNames, 'other')).toEqual([
        ...answersAndContext,
        { group: 'Grammar', fieldNames: ['Forms'] },
        ...variantsAndExtras,
      ]);
    });
  });

  describe('when Anki orders fields differently', () => {
    test('keeps its order within a group', () => {
      expect(shownFieldGroups(['Notes', 'Definitions', 'Examples'], 'noun')).toEqual([
        { group: 'Answers', fieldNames: ['Definitions'] },
        { group: 'Extras', fieldNames: ['Notes', 'Examples'] },
      ]);
    });
  });

  describe('when Anki has a field note-type.ts does not name', () => {
    test('leaves it out', () => {
      expect(shownFieldGroups(['Notes', 'Comments'], 'noun')).toEqual([
        { group: 'Extras', fieldNames: ['Notes'] },
      ]);
    });
  });
});

describe('FIELD_NAMES', () => {
  // Two keys naming one field would make composition a guess about which one it fills.
  test('names each field once', () => {
    expect(new Set(FIELD_NAMES).size).toBe(FIELD_NAMES.length);
  });
});
