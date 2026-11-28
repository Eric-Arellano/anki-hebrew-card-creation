import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { CheckRequest } from '#lib/api/ai.ts';
import { PARTS_OF_SPEECH } from '#lib/note-type.ts';
import { checkNote, fieldTexts } from '#lib/server/ai/check.ts';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { lookUpHomographs } from '#lib/server/ai/homographs.ts';
import { DICTIONARY_PATHS, type DictionaryPaths } from '#lib/server/dictionary/paths.ts';
import { parseJsonBody, withAiErrorsAs502, withDictionaryAs503 } from '#lib/server/route-errors.ts';
import type { RequestHandler } from './$types';

const checkRequestBodySchema = z.strictObject({
  partOfSpeech: z.enum(PARTS_OF_SPEECH),
  fields: z.record(z.string(), z.string()),
}) satisfies z.ZodType<CheckRequest>;

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
  const { word, wordPointed = '' } = fieldTexts(body);
  if (word === undefined) error(400, 'Type the word first.');

  const homographs = withDictionaryAs503(() => lookUpHomographs(paths, word, wordPointed));
  return Response.json(await withAiErrorsAs502(() => checkNote(body, homographs, messages)));
}
