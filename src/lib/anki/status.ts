import { DECK, NOTE_TYPE } from '#lib/note-type.ts';
import type { AnkiStatus } from '#lib/server/deck.ts';

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
