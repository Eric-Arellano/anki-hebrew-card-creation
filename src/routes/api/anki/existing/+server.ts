import { error } from '@sveltejs/kit';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { findExistingNotes } from '#lib/server/anki/existing-notes.ts';
import { withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _findExisting(anki, url);

export async function _findExisting(anki: AnkiClient, url: URL): Promise<Response> {
  const words = url.searchParams.getAll('word');
  if (words.length === 0) error(400, 'word is required');
  return Response.json(await withAnkiErrorsAs502(() => findExistingNotes(anki, words)));
}
