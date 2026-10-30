import { z } from 'zod';
import { searchByNoteIds } from '#lib/anki/search.ts';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { parseJsonBody, withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

const browseRequestBodySchema = z.strictObject({ noteIds: z.array(z.int().positive()).min(1) });

export const POST: RequestHandler = ({ request }) => _browseNotes(anki, request);

export async function _browseNotes(anki: AnkiClient, request: Request): Promise<Response> {
  const { noteIds } = await parseJsonBody(
    request,
    browseRequestBodySchema,
    'noteIds must be a non-empty list of note ids',
  );
  await withAnkiErrorsAs502(() => anki('guiBrowse', { query: searchByNoteIds(noteIds) }));
  return new Response(null, { status: 204 });
}
