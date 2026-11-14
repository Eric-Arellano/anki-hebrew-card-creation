import { error } from '@sveltejs/kit';
import type { z } from 'zod';
import { AiError } from '#lib/server/ai/client.ts';
import { AnkiError } from '#lib/server/anki/client.ts';
import { DictionaryUnavailableError } from '#lib/server/dictionary/lookup.ts';

/** The request's JSON body as `schema` parses it, else a 400 that says `message`. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  message: string,
): Promise<T> {
  const parsedBody = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsedBody.success) error(400, message);
  return parsedBody.data;
}

/** What `call` returns, or a 502 with Anki's failure when Anki fails. */
export async function withAnkiErrorsAs502<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (cause instanceof AnkiError) error(502, cause.message);
    throw cause;
  }
}

/** What `call` returns, or a 502 with Claude's failure when asking Claude fails. */
export async function withAiErrorsAs502<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (cause instanceof AiError) error(502, cause.message);
    throw cause;
  }
}

/** What `call` returns, or a 503 saying how to build the index when there's no usable one. */
export function withDictionaryAs503<T>(call: () => T): T {
  try {
    return call();
  } catch (cause) {
    if (cause instanceof DictionaryUnavailableError) error(503, cause.message);
    throw cause;
  }
}
