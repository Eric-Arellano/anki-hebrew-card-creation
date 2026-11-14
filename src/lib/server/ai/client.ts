// The one module that reaches api.anthropic.com. Only a route answering the human's click or Save
// calls it, and only the note's own text goes in a request.
import Anthropic, { type AnthropicError } from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { ANTHROPIC_API_KEY } from '$app/env/private';

// Opus, because Hebrew is where models are weakest. Low effort keeps a call to a few cents.
// `fallbacks: 'default'` reruns a refused request on the model Anthropic picks for that kind of
// refusal, rather than one we would have to keep current.
const REQUEST_SETTINGS: Omit<
  Anthropic.Beta.MessageCreateParamsNonStreaming,
  'system' | 'messages'
> & { output_config: { effort: 'low' } } = {
  model: 'claude-opus-5-5',
  output_config: { effort: 'low' },
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
  max_tokens: 16000,
};

/** What went wrong asking Claude, in words the editor can show as they are. */
export class AiError extends Error {
  override name = 'AiError';
}

// The slice of the SDK's `client.beta.messages` this module uses, so a test can fake it.
export type ClaudeMessages = {
  create(
    params: Anthropic.Beta.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Beta.BetaMessage>;
};

export type StructuredRequest<T> = { system: string; user: string; schema: z.ZodType<T> };

export function isAiAvailable(): boolean {
  return ANTHROPIC_API_KEY !== undefined;
}

function defaultMessages(): ClaudeMessages {
  if (ANTHROPIC_API_KEY === undefined) throw new AiError('Set ANTHROPIC_API_KEY to use Claude.');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY }).beta.messages;
}

/** Claude's answer to `user`, parsed against `schema`. */
export async function askForStructured<T>(
  { system, user, schema }: StructuredRequest<T>,
  messages: ClaudeMessages = defaultMessages(),
): Promise<T> {
  const format = betaZodOutputFormat(schema);
  const message = await withSdkErrorsAsAiErrors(() =>
    messages.create({
      ...REQUEST_SETTINGS,
      output_config: { ...REQUEST_SETTINGS.output_config, format },
      system,
      messages: [{ role: 'user', content: user }],
    }),
  );

  // Checked before parsing, because a refused or truncated answer is not valid JSON.
  if (message.stop_reason === 'refusal') throw new AiError('Claude declined to answer.');
  if (message.stop_reason === 'max_tokens') throw new AiError('Claude’s answer was cut off.');

  const text = message.content.find((block) => block.type === 'text')?.text;
  if (text === undefined) throw new AiError('Claude sent no answer.');
  try {
    return format.parse(text);
  } catch {
    throw new AiError('Claude sent an answer in the wrong shape.');
  }
}

async function withSdkErrorsAsAiErrors<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (!(cause instanceof Anthropic.AnthropicError)) throw cause;
    throw new AiError(sdkErrorMessage(cause), { cause });
  }
}

// Most specific first: the timeout and status classes all extend `APIError`.
function sdkErrorMessage(error: AnthropicError): string {
  if (error instanceof Anthropic.APIConnectionTimeoutError)
    return 'Claude took too long to answer.';
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Can’t reach api.anthropic.com. Are you online?';
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return 'Anthropic refused the API key. Check ANTHROPIC_API_KEY.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Claude is rate limited. Try again in a minute.';
  }
  if (error instanceof Anthropic.InternalServerError) {
    return 'Claude is overloaded or down. Try again shortly.';
  }
  // A 400 is where a spent credit balance shows up, and Anthropic's own words say so best.
  if (error instanceof Anthropic.APIError) {
    return `Anthropic answered ${error.status}: ${error.apiMessage ?? error.message}`;
  }
  return error.message;
}
