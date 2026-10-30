import { describe, expect, test } from 'vitest';
import type { FieldDrift } from '#lib/api/anki.ts';
import { FIELD_NAMES } from '#lib/note-type.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { ankiStatusProblem, fieldOrder } from './status.ts';

function connectedWithDrift(drift: FieldDrift) {
  return {
    kind: 'connected',
    ankiConnectVersion: 6,
    deckFound: true,
    noteType: { found: true, liveFieldNames: fieldNames, drift },
  } as const;
}

describe('ankiStatusProblem', () => {
  describe('when Anki matches the note type', () => {
    test('finds none', () => {
      expect(
        ankiStatusProblem(connectedWithDrift({ missingFromAnki: [], unexpectedInAnki: [] })),
      ).toBeUndefined();
    });
  });

  describe('when Anki could not be reached', () => {
    test('passes on the error', () => {
      expect(ankiStatusProblem({ kind: 'error', message: 'Is Anki open?' })).toBe('Is Anki open?');
    });
  });

  describe('when the deck or note type is missing', () => {
    test('names the deck first', () => {
      expect(
        ankiStatusProblem({
          kind: 'connected',
          ankiConnectVersion: 6,
          deckFound: false,
          noteType: { found: false },
        }),
      ).toBe('Anki has no deck named עברית');
    });

    test('names the note type', () => {
      expect(
        ankiStatusProblem({
          kind: 'connected',
          ankiConnectVersion: 6,
          deckFound: true,
          noteType: { found: false },
        }),
      ).toBe('Anki has no note type named Hebrew');
    });
  });

  describe('when the fields have drifted', () => {
    test('names each drifted field', () => {
      expect(
        ankiStatusProblem(
          connectedWithDrift({ missingFromAnki: ['Notes'], unexpectedInAnki: ['Comments'] }),
        ),
      ).toBe(
        'src/lib/note-type.ts and the Hebrew note type disagree on fields (missing from Anki: Notes; not in note-type.ts: Comments)',
      );
    });

    test('leaves out a side that has no drift', () => {
      expect(
        ankiStatusProblem(
          connectedWithDrift({ missingFromAnki: [], unexpectedInAnki: ['Comments', 'Tags'] }),
        ),
      ).toBe(
        'src/lib/note-type.ts and the Hebrew note type disagree on fields (not in note-type.ts: Comments, Tags)',
      );
    });
  });
});

describe('fieldOrder', () => {
  test("follows Anki's order once Anki gives one", () => {
    const liveFieldNames = [...fieldNames].reverse();
    const drift = { missingFromAnki: [], unexpectedInAnki: [] };
    expect(
      fieldOrder({
        kind: 'connected',
        ankiConnectVersion: 6,
        deckFound: true,
        noteType: { found: true, liveFieldNames, drift },
      }),
    ).toEqual(liveFieldNames);
  });

  describe('while Anki is being checked', () => {
    test("follows note-type.ts's order", () => {
      expect(fieldOrder(undefined)).toEqual(FIELD_NAMES);
    });
  });

  describe('when Anki has no such note type', () => {
    test("follows note-type.ts's order", () => {
      expect(
        fieldOrder({
          kind: 'connected',
          ankiConnectVersion: 6,
          deckFound: true,
          noteType: { found: false },
        }),
      ).toEqual(FIELD_NAMES);
    });
  });
});
