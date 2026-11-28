import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { SuggestRequest } from '#lib/api/ai.ts';
import { PREPOSITION_CHOICES } from '#lib/card/meanings.ts';
import { CHOOSE_PREPOSITIONS } from '#lib/card/suggestions.ts';
import { PARTS_OF_SPEECH } from '#lib/note-type.ts';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { lookUpHomographs } from '#lib/server/ai/homographs.ts';
import { suggest } from '#lib/server/ai/suggest.ts';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/paths.ts';
import { parseJsonBody, withAiErrorsAs502, withDictionaryAs503 } from '#lib/server/route-errors.ts';
import type { RequestHandler } from './$types';

const suggestRequestBodySchema = z.strictObject({
  word: z.string(),
  pointed: z.string(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  meanings: z.array(
    z.strictObject({
      english: z.string().trim(),
      preposition: z.enum(PREPOSITION_CHOICES).optional(),
    }),
  ),
  forms: z.array(z.strictObject({ label: z.string(), form: z.string() })),
}) satisfies z.ZodType<SuggestRequest, unknown>;

export const POST: RequestHandler = ({ request }) => _suggest(DICTIONARY_PATHS, request);

export async function _suggest(
  paths: DictionaryPaths,
  request: Request,
  messages?: ClaudeMessages,
): Promise<Response> {
  const body = await parseJsonBody(
    request,
    suggestRequestBodySchema,
    'The body must hold the word, its pointed form, its part of speech, its meanings and its forms',
  );
  const word = body.word.trim();
  const meanings = body.meanings.filter(({ english }) => english !== '');
  if (word === '' || meanings.length === 0) error(400, 'Type the word and a meaning first.');
  if (
    body.partOfSpeech === 'verb' &&
    meanings.some(({ preposition }) => preposition === undefined)
  ) {
    error(400, CHOOSE_PREPOSITIONS);
  }

  // Looked up here, because the editor stops looking up once an entry is picked.
  const homographs = withDictionaryAs503(() => lookUpHomographs(paths, word, body.pointed));
  return Response.json(
    await withAiErrorsAs502(() => suggest({ ...body, word, meanings }, homographs, messages)),
  );
}
