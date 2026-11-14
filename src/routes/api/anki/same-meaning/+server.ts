import { error } from '@sveltejs/kit';
import type { AnkiClient } from '#lib/server/anki/client.ts';
import { anki } from '#lib/server/anki/connection.ts';
import { findSameMeaningNotes } from '#lib/server/anki/same-meaning-notes.ts';
import { withAnkiErrorsAs502 } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _findSameMeaning(anki, url);

export async function _findSameMeaning(anki: AnkiClient, url: URL): Promise<Response> {
  const meanings = url.searchParams.getAll('meaning');
  if (meanings.length === 0) error(400, 'meaning is required');
  const words = url.searchParams.getAll('word');
  return Response.json(
    await withAnkiErrorsAs502(() => findSameMeaningNotes(anki, meanings, words)),
  );
}
