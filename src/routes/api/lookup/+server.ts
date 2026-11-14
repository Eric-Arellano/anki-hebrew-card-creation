import { error } from '@sveltejs/kit';
import { lookUp, withDictionary } from '#lib/server/dictionary/lookup.ts';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/paths.ts';
import { withDictionaryAs503 } from '#lib/server/route-errors.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => _lookUp(DICTIONARY_PATHS, url);

export function _lookUp(paths: DictionaryPaths, url: URL): Response {
  const word = url.searchParams.get('word');
  if (word === null) error(400, 'word is required');
  return Response.json(
    withDictionaryAs503(() =>
      withDictionary(paths, (db, staleIndex) => lookUp(db, word, staleIndex)),
    ),
  );
}
