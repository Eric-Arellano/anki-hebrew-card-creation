import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { searchByNoteIds } from '#lib/anki/search.ts';
import { AnkiError } from '#lib/server/anki.ts';
import { anki } from '#lib/server/anki-connection.ts';
import type { RequestHandler } from './$types';

const browseRequestBodySchema = z.strictObject({ noteIds: z.array(z.int().positive()).min(1) });

export const POST: RequestHandler = async ({ request }) => {
  const parsedBody = browseRequestBodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsedBody.success) error(400, 'noteIds must be a non-empty list of note ids');
  try {
    await anki('guiBrowse', { query: searchByNoteIds(parsedBody.data.noteIds) });
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
  return new Response(null, { status: 204 });
};
