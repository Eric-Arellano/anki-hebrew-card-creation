import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { DECK, FIELD_NAMES, NOTE_TYPE, TAGS } from '#lib/note-type.ts';
import { type AnkiClient, AnkiError } from '#lib/server/anki.ts';
import { anki } from '#lib/server/anki-connection.ts';
import type { RequestHandler } from './$types';

const addRequestBodySchema = z.strictObject({ fields: z.record(z.string(), z.string()) });

export const POST: RequestHandler = ({ request }) => _openAddWindow(anki, request);

// `guiAddCards` only opens the Add window, pre-filled, and replaces whatever was in it. The editor
// confirms before calling this; the human clicks Add.
export async function _openAddWindow(anki: AnkiClient, request: Request): Promise<Response> {
  const parsedBody = addRequestBodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsedBody.success) error(400, 'fields must map field names to text');

  const unknownFieldNames = Object.keys(parsedBody.data.fields).filter(
    (name) => !FIELD_NAMES.includes(name),
  );
  if (unknownFieldNames.length > 0) error(400, `Unknown fields: ${unknownFieldNames.join(', ')}`);

  try {
    await anki('guiAddCards', {
      note: {
        deckName: DECK,
        modelName: NOTE_TYPE,
        fields: parsedBody.data.fields,
        tags: [...TAGS],
      },
    });
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
  return new Response(null, { status: 204 });
}
