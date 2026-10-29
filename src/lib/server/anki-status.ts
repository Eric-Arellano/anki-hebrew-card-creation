import type { AnkiStatus, FieldDrift } from '#lib/api.ts';
import { DECK, FIELD_NAMES, NOTE_TYPE } from '#lib/note-type.ts';
import { type AnkiClient, AnkiError } from '#lib/server/anki-client.ts';

function findFieldDrift(
  expectedFieldNames: readonly string[],
  liveFieldNames: readonly string[],
): FieldDrift {
  return {
    missingFromAnki: expectedFieldNames.filter((name) => !liveFieldNames.includes(name)),
    unexpectedInAnki: liveFieldNames.filter((name) => !expectedFieldNames.includes(name)),
  };
}

export async function getAnkiStatus(anki: AnkiClient): Promise<AnkiStatus> {
  try {
    const [ankiConnectVersion, deckNames, noteTypeNames] = await Promise.all([
      anki('version'),
      anki('deckNames'),
      anki('modelNames'),
    ]);
    const deckFound = deckNames.includes(DECK);
    if (!noteTypeNames.includes(NOTE_TYPE)) {
      return { kind: 'connected', ankiConnectVersion, deckFound, noteType: { found: false } };
    }

    const liveFieldNames = await anki('modelFieldNames', { modelName: NOTE_TYPE });
    const drift = findFieldDrift(FIELD_NAMES, liveFieldNames);
    return {
      kind: 'connected',
      ankiConnectVersion,
      deckFound,
      noteType: { found: true, liveFieldNames, drift },
    };
  } catch (error) {
    if (error instanceof AnkiError) return { kind: 'error', message: error.message };
    throw error;
  }
}
