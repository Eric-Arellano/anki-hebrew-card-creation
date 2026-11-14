import type { AiStatus } from '#lib/api/ai.ts';
import { isAiAvailable } from '#lib/server/ai/client.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
  Response.json({ available: isAiAvailable() } satisfies AiStatus);
