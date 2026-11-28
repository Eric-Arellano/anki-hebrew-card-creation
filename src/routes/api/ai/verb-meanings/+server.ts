import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { VerbMeaningsRequest } from '#lib/api/ai.ts';
import { PREPOSITION_CHOICES } from '#lib/card/meanings.ts';
import { verbMeaningsBlocker } from '#lib/card/verb-meaning-suggestions.ts';
import { GOVERNED_PREPOSITIONS } from '#lib/hebrew/preposition.ts';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { suggestVerbMeanings } from '#lib/server/ai/verb-meanings.ts';
import { parseJsonBody, withAiErrorsAs502 } from '#lib/server/route-errors.ts';
import type { RequestHandler } from './$types';

// A blank meaning is refused rather than dropped, since Claude's answer points at the meanings by
// their place in the list.
const verbMeaningsRequestSchema = z.strictObject({
  word: z.string().trim(),
  pointed: z.string().trim(),
  meanings: z.array(
    z.strictObject({
      english: z.string().trim().min(1),
      preposition: z.enum(PREPOSITION_CHOICES).optional(),
    }),
  ),
  dictionaryDefinitions: z.array(z.string()),
  dictionaryPrepositions: z.array(z.enum(GOVERNED_PREPOSITIONS)),
}) satisfies z.ZodType<VerbMeaningsRequest, unknown>;

export const POST: RequestHandler = ({ request }) => _suggestVerbMeanings(request);

export async function _suggestVerbMeanings(
  request: Request,
  messages?: ClaudeMessages,
): Promise<Response> {
  const body = await parseJsonBody(
    request,
    verbMeaningsRequestSchema,
    'The body must hold the verb, its pointed form, its meanings, none blank, and its dictionary definitions and prepositions',
  );
  const blocker = verbMeaningsBlocker(body);
  if (blocker !== undefined) error(400, blocker);
  return Response.json(await withAiErrorsAs502(() => suggestVerbMeanings(body, messages)));
}
