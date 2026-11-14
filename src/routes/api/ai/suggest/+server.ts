import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { PARTS_OF_SPEECH } from '#lib/note-type.ts';
import { AiError, type ClaudeMessages, isAiAvailable } from '#lib/server/ai/client.ts';
import { lookUpHomographs } from '#lib/server/ai/homographs.ts';
import { suggest } from '#lib/server/ai/suggest.ts';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/files.ts';
import { parseJsonBody } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

const suggestRequestBodySchema = z.strictObject({
  word: z.string(),
  pointed: z.string(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  definitions: z.array(z.string()),
  forms: z.array(z.strictObject({ label: z.string(), form: z.string() })),
});

export const POST: RequestHandler = ({ request }) => _suggest(DICTIONARY_PATHS, request);

export async function _suggest(
  paths: DictionaryPaths,
  request: Request,
  messages?: ClaudeMessages,
): Promise<Response> {
  const body = await parseJsonBody(
    request,
    suggestRequestBodySchema,
    'The body must hold the word, its pointed form, its part of speech, its definitions and its forms',
  );
  const word = body.word.trim();
  const definitions = body.definitions.map((meaning) => meaning.trim()).filter(Boolean);
  if (word === '' || definitions.length === 0) error(400, 'Type the word and a meaning first.');
  if (!isAiAvailable()) error(503, 'Set ANTHROPIC_API_KEY to use Claude.');

  // Looked up here, because the editor stops looking up once an entry is picked.
  const homographs = lookUpHomographs(paths, word, body.pointed);
  try {
    return Response.json(await suggest({ ...body, word, definitions }, homographs, messages));
  } catch (cause) {
    if (cause instanceof AiError) error(502, cause.message);
    throw cause;
  }
}
