import { error } from '@sveltejs/kit';
import { type Config, config } from '#lib/config.ts';
import { type AnkiClient, AnkiError } from '#lib/server/anki.ts';
import { anki } from '#lib/server/anki-connection.ts';
import { findExistingNotes } from '#lib/server/deck.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _findExisting(anki, config, url);

export async function _findExisting(anki: AnkiClient, config: Config, url: URL): Promise<Response> {
  const word = url.searchParams.get('word');
  if (word === null) error(400, 'word is required');
  try {
    return Response.json(await findExistingNotes(anki, config, word));
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
}
