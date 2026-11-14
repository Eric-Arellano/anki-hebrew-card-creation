// Our `/api/ai/` endpoints: what each answers, and the browser's one way to call each.
import { getJson, postJsonForReply } from '#lib/api/http.ts';
import type { Example, LabeledForm } from '#lib/card/examples.ts';
import type { FieldKey, FieldValues, PartOfSpeech } from '#lib/note-type.ts';

// `available` is whether the server has an Anthropic API key, never the key itself.
export type AiStatus = { available: boolean };

export function fetchAiStatus(): Promise<AiStatus> {
  return getJson('/api/ai/status');
}

// The fields the dictionary can't fill, which Claude suggests, are the examples and these hints.
export const SUGGESTED_HINTS = [
  'productionContext',
  'readingContext',
] as const satisfies readonly FieldKey[];

// `pointed` may be blank, and then no Reading context is suggested, since nothing tells the note's
// own entry from its homographs.
export type SuggestRequest = {
  word: string;
  pointed: string;
  partOfSpeech: PartOfSpeech;
  definitions: string[];
  forms: LabeledForm[];
};

// Examples a row each, and a hint as its textarea holds it. A field is missing where Claude had
// nothing for it, or what it wrote failed a guard.
export type Suggestions = { examples?: Example[] } & Partial<
  Record<(typeof SUGGESTED_HINTS)[number], string>
>;

export function fetchSuggestions(request: SuggestRequest): Promise<Suggestions> {
  return postJsonForReply('/api/ai/suggest', request);
}

// The note's fields as Anki will hold them, as HTML. The server sends Claude only their text.
export type CheckRequest = { partOfSpeech: PartOfSpeech; fields: FieldValues };

// `rewrite` is plain text, which the human applies by hand.
export type Finding = { field: FieldKey; problem: string; rewrite?: string };

export type NoteCheck = { findings: Finding[] };

export function fetchNoteCheck(request: CheckRequest, signal?: AbortSignal): Promise<NoteCheck> {
  return postJsonForReply('/api/ai/check', request, signal);
}
