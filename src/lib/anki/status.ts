import type { AnkiStatus } from '#lib/api/anki.ts';
import { DECK, FIELD_NAMES, NOTE_TYPE } from '#lib/note-type.ts';

/** The note type's fields in Anki's order, or in `FIELD_NAMES`' order until Anki gives one. */
export function fieldOrder(status: AnkiStatus | undefined): readonly string[] {
  return status?.kind === 'connected' && status.noteType.found
    ? status.noteType.liveFieldNames
    : FIELD_NAMES;
}

/** What stops a hand-off to this Anki, or `undefined` when nothing does. */
export function ankiStatusProblem(status: AnkiStatus): string | undefined {
  if (status.kind === 'error') return status.message;
  if (!status.deckFound) return `Anki has no deck named ${DECK}`;
  if (!status.noteType.found) return `Anki has no note type named ${NOTE_TYPE}`;

  const { missingFromAnki, unexpectedInAnki } = status.noteType.drift;
  const mismatches = [
    ...(missingFromAnki.length > 0 ? [`missing from Anki: ${missingFromAnki.join(', ')}`] : []),
    ...(unexpectedInAnki.length > 0 ? [`not in note-type.ts: ${unexpectedInAnki.join(', ')}`] : []),
  ];
  if (mismatches.length === 0) return undefined;
  return `src/lib/note-type.ts and the ${NOTE_TYPE} note type disagree on fields (${mismatches.join('; ')})`;
}
