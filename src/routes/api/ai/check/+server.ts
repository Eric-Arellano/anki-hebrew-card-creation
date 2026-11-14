import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { PARTS_OF_SPEECH } from '#lib/note-type.ts';
import { checkNote, fieldTexts } from '#lib/server/ai/check.ts';
import { AiError, type ClaudeMessages } from '#lib/server/ai/client.ts';
import { lookUpHomographs } from '#lib/server/ai/homographs.ts';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/files.ts';
import { parseJsonBody } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

const checkRequestBodySchema = z.strictObject({
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  fields: z.record(z.string(), z.string()),
});

export const POST: RequestHandler = ({ request }) => _check(DICTIONARY_PATHS, request);

export async function _check(
  paths: DictionaryPaths,
  request: Request,
  messages?: ClaudeMessages,
): Promise<Response> {
  const body = await parseJsonBody(
    request,
    checkRequestBodySchema,
    'The body must hold the part of speech, and fields mapping field keys to text',
  );
  const { unpointed, pointed = '' } = fieldTexts(body.fields);
  if (unpointed === undefined) error(400, 'Type the word first.');

  const homographs = lookUpHomographs(paths, unpointed, pointed);
  try {
    return Response.json(await checkNote(body, homographs, messages));
  } catch (cause) {
    if (cause instanceof AiError) error(502, cause.message);
    throw cause;
  }
}
