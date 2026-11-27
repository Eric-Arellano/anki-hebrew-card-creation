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

export type VerbMeaningsRequest = {
  word: string;
  pointed: string;
  /** The human's meanings so far, each with English, which an answer's `fromIndex` points into. */
  meanings: Meaning[];
  /** The picked entry's definitions, empty when no verb entry is picked. */
  dictionaryDefinitions: string[];
  /** The prepositions the picked entry names for the whole verb, not for any one meaning. */
  dictionaryPrepositions: GovernedPreposition[];
};

export type SuggestedVerbMeaning = {
  english: string;
  preposition: PrepositionChoice;
  /** Which of the request's `meanings` this keeps or splits, or absent for one Claude added. */
  fromIndex?: number;
  /** A short unpointed phrase that shows the preposition in use. */
  usage?: string;
  /** Why Claude overrode the human's preposition, or which other one fits as well. */
  note?: string;
};

export type VerbMeaningSuggestions = { meanings: SuggestedVerbMeaning[] };

export function fetchVerbMeaningSuggestions(
  request: VerbMeaningsRequest,
): Promise<VerbMeaningSuggestions> {
  return postJsonForReply('/api/ai/verb-meanings', request);
}

// The note's fields as Anki will hold them, as HTML. The server sends Claude only their text.
export type CheckRequest = { partOfSpeech: PartOfSpeech; fields: FieldValues };

// `rewrite` is plain text, which the human applies by hand.
export type Finding = { field: FieldKey; problem: string; rewrite?: string };

export type NoteCheck = { findings: Finding[] };

export function fetchNoteCheck(request: CheckRequest, signal?: AbortSignal): Promise<NoteCheck> {
  return postJsonForReply('/api/ai/check', request, signal);
}
