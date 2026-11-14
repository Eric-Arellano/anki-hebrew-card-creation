// Our `/api/ai/` endpoints: what each answers, and the browser's one way to call each.
import { getJson } from '#lib/api/http.ts';

// `available` is whether the server has an Anthropic API key, never the key itself.
export type AiStatus = { available: boolean };

export function fetchAiStatus(): Promise<AiStatus> {
  return getJson('/api/ai/status');
}
