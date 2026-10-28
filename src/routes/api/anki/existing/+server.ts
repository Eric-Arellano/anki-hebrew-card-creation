import { error } from '@sveltejs/kit';
import { config } from '#lib/config.ts';
import { AnkiError } from '#lib/server/anki.ts';
import { anki } from '#lib/server/anki-connection.ts';
import { findExisting } from '#lib/server/deck.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const word = url.searchParams.get('word');
  if (word === null) error(400, 'word is required');
  try {
    return Response.json(await findExisting(anki, config, word));
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
};
