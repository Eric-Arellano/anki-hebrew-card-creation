import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { MeaningsRequest } from '#lib/api/ai.ts';
import { PREPOSITION_CHOICES } from '#lib/card/definitions.ts';
import { GOVERNED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { suggestMeanings } from '#lib/server/ai/meanings.ts';
import { parseJsonBody, withAiErrorsAs502 } from '#lib/server/route-errors.ts';
import type { RequestHandler } from './$types';

// A blank meaning is refused rather than dropped, since Claude's answer points at the meanings by
// their place in the list.
const meaningsRequestBodySchema = z.strictObject({
  word: z.string().trim(),
  pointed: z.string().trim(),
  meanings: z.array(
    z.strictObject({
      english: z.string().trim().min(1),
      preposition: z.enum(PREPOSITION_CHOICES).optional(),
    }),
  ),
  glosses: z.array(z.string()),
  prepositions: z.array(z.enum(GOVERNED_PREPOSITIONS)),
}) satisfies z.ZodType<MeaningsRequest, unknown>;

export const POST: RequestHandler = ({ request }) => _suggestMeanings(request);

export async function _suggestMeanings(
  request: Request,
  messages?: ClaudeMessages,
): Promise<Response> {
  const body = await parseJsonBody(
    request,
    meaningsRequestBodySchema,
    'The body must hold the verb, its pointed form, its meanings, none blank, and its dictionary definitions and prepositions',
  );
  if (body.word === '') error(400, 'Type the verb first.');
  if (body.meanings.length === 0 && body.glosses.length === 0) {
    error(400, 'Type a meaning, or pick the verb’s dictionary entry, first.');
  }
  return Response.json(await withAiErrorsAs502(() => suggestMeanings(body, messages)));
}
