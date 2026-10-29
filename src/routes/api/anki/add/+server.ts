import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { DECK, FIELD_NAMES, NOTE_TYPE, TAGS } from '#lib/note-type.ts';
import type { AnkiClient } from '#lib/server/anki-client.ts';
import { anki } from '#lib/server/anki-connection.ts';
import { parseJsonBody, withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

const addRequestBodySchema = z.strictObject({ fields: z.record(z.string(), z.string()) });

export const POST: RequestHandler = ({ request }) => _openAddWindow(anki, request);

// `guiAddCards` only opens the Add window, pre-filled, and replaces whatever was in it. The editor
// confirms before calling this; the human clicks Add.
export async function _openAddWindow(anki: AnkiClient, request: Request): Promise<Response> {
  const { fields } = await parseJsonBody(
    request,
    addRequestBodySchema,
    'fields must map field names to text',
  );

  const unknownFieldNames = Object.keys(fields).filter((name) => !FIELD_NAMES.includes(name));
  if (unknownFieldNames.length > 0) error(400, `Unknown fields: ${unknownFieldNames.join(', ')}`);

  await withAnkiErrorsAs502(() =>
    anki('guiAddCards', {
      note: { deckName: DECK, modelName: NOTE_TYPE, fields, tags: [...TAGS] },
    }),
  );
  return new Response(null, { status: 204 });
}
