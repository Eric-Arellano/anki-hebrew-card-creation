import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { handOffFields } from './hand-off.ts';

const blankFields = Object.fromEntries(fieldNames.map((name) => [name, '']));

describe('handOffFields', () => {
  test('sends what composition gives each field, and every other field blank', () => {
    expect(
      handOffFields({ composed: { unpointed: 'דג', gender: 'm' }, edits: {}, shownFields: [] }),
    ).toEqual({ ...blankFields, Hebrew: 'דג', Gender: 'm' });
  });

  describe('for a shown field the human edited', () => {
    test('sends the edit over what composition gives it, with each new line as a <br>', () => {
      expect(
        handOffFields({
          composed: { forms: 'pl: דָּגִים' },
          edits: { forms: 'f: דָּגָה\nm.pl: דָּגִים' },
          shownFields: ['forms'],
        }),
      ).toEqual({ ...blankFields, Forms: 'f: דָּגָה<br>m.pl: דָּגִים' });
    });
  });

  describe('for a hidden field the human edited', () => {
    test('ignores the edit', () => {
      expect(
        handOffFields({
          composed: { forms: 'pl: דָּגִים' },
          edits: { forms: 'f: דָּגָה', binyan: "pi'el" },
          shownFields: ['notes'],
        }),
      ).toEqual({ ...blankFields, Forms: 'pl: דָּגִים' });
    });
  });
});
