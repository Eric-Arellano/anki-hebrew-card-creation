// Our `/api/ai/` endpoints: what each answers, and the browser's one way to call each.
import { postJsonForReply } from '#lib/api/http.ts';
import type { Meaning, PrepositionChoice } from '#lib/card/definitions.ts';
import type { Example } from '#lib/card/examples.ts';
import type { LabeledForm } from '#lib/card/parts-of-speech/forms.ts';
import type { GovernedPreposition } from '#lib/hebrew/preposition.ts';
import type { FieldKey, FieldValues, PartOfSpeech } from '#lib/note-type.ts';

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

// A verb's meanings so far, each with English, and what the picked dictionary entry says of them:
// its definitions, and the prepositions it names for the whole entry. Either may be empty.
export type MeaningsRequest = {
  word: string;
  pointed: string;
  meanings: Meaning[];
  glosses: string[];
  prepositions: GovernedPreposition[];
};

// `from` is the index in the request's `meanings` of the one this keeps or splits, and absent for a
// meaning Claude added. `usage` is a short unpointed phrase that shows the preposition, and `note`
// says why Claude overrode the human's choice, or which other preposition fits as well.
export type SuggestedMeaning = {
  english: string;
  preposition: PrepositionChoice;
  from?: number;
  usage?: string;
  note?: string;
};

export type MeaningSuggestions = { meanings: SuggestedMeaning[] };

export function fetchMeaningSuggestions(request: MeaningsRequest): Promise<MeaningSuggestions> {
  return postJsonForReply('/api/ai/meanings', request);
}

// The note's fields as Anki will hold them, as HTML. The server sends Claude only their text.
export type CheckRequest = { partOfSpeech: PartOfSpeech; fields: FieldValues };

// `rewrite` is plain text, which the human applies by hand.
export type Finding = { field: FieldKey; problem: string; rewrite?: string };

export type NoteCheck = { findings: Finding[] };

export function fetchNoteCheck(request: CheckRequest, signal?: AbortSignal): Promise<NoteCheck> {
  return postJsonForReply('/api/ai/check', request, signal);
}
