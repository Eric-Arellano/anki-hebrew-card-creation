import { error } from '@sveltejs/kit';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/files.ts';
import {
  DictionaryUnavailableError,
  lookUp,
  withDictionary,
} from '#lib/server/dictionary/lookup.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _lookUp(DICTIONARY_PATHS, url);

export function _lookUp(paths: DictionaryPaths, url: URL): Response {
  const word = url.searchParams.get('word');
  if (word === null) error(400, 'word is required');
  try {
    return Response.json(withDictionary(paths, (db, staleIndex) => lookUp(db, word, staleIndex)));
  } catch (cause) {
    if (cause instanceof DictionaryUnavailableError) error(503, cause.message);
    throw cause;
  }
}
