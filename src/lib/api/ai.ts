// Our `/api/ai/` endpoints: what each answers, and the browser's one way to call each.
import { getJson, postJsonForReply } from '#lib/api/http.ts';
import type { FieldKey, PartOfSpeech } from '#lib/note-type.ts';

// `available` is whether the server has an Anthropic API key, never the key itself.
export type AiStatus = { available: boolean };

export function fetchAiStatus(): Promise<AiStatus> {
  return getJson('/api/ai/status');
}

// The fields the dictionary can't fill, which Claude suggests.
export const SUGGESTED_FIELDS = [
  'examples',
  'productionContext',
  'readingContext',
] as const satisfies readonly FieldKey[];

export type SuggestedField = (typeof SUGGESTED_FIELDS)[number];

// `pointed` may be blank, and then no Reading context is suggested, since nothing tells the note's
// own entry from its homographs.
export type SuggestRequest = {
  word: string;
  pointed: string;
  partOfSpeech: PartOfSpeech;
  definitions: string[];
};

// Each as the field's textarea holds it. A field is missing where Claude had nothing for it, or
// what it wrote failed a guard.
export type Suggestions = Partial<Record<SuggestedField, string>>;

export function fetchSuggestions(request: SuggestRequest): Promise<Suggestions> {
  return postJsonForReply('/api/ai/suggest', request);
}
