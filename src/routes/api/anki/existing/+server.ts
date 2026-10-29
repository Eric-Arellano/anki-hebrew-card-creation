import { error } from '@sveltejs/kit';
import { type AnkiClient, AnkiError } from '#lib/server/anki.ts';
import { anki } from '#lib/server/anki-connection.ts';
import { findExistingNotes } from '#lib/server/existing-notes.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _findExisting(anki, url);

export async function _findExisting(anki: AnkiClient, url: URL): Promise<Response> {
  const word = url.searchParams.get('word');
  if (word === null) error(400, 'word is required');
  try {
    return Response.json(await findExistingNotes(anki, word));
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
}
