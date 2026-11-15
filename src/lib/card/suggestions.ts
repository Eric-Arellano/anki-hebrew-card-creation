// What Suggest with Claude asks about, and what its reply may fill.

import { SUGGESTED_HINTS, type Suggestions, type SuggestRequest } from '#lib/api/ai.ts';
import type { CardDraft } from '#lib/card/draft.ts';
import { type Example, isBlankExample } from '#lib/card/examples.ts';
import { filledDefinitions } from '#lib/card/inputs.ts';
import { labeledForms } from '#lib/card/parts-of-speech/forms.ts';
import type { FieldKey, FieldValues, PartOfSpeech } from '#lib/note-type.ts';

type AskedAbout = Pick<CardDraft, 'inputs' | 'edits' | 'examples'>;

function isBlankHint(edits: FieldValues, field: FieldKey): boolean {
  return (edits[field] ?? '').trim() === '';
}

/** Why there is nothing to ask Claude for yet, or `undefined` once there is. */
export function suggestBlocker({ inputs, edits, examples }: AskedAbout): string | undefined {
  if (inputs.word.trim() === '' || filledDefinitions(inputs.definitions).length === 0) {
    return 'Type the word and a meaning first.';
  }
  if (
    !examples.every(isBlankExample) &&
    SUGGESTED_HINTS.every((field) => !isBlankHint(edits, field))
  ) {
    return 'The examples and both hints are filled. Clear one to have it suggested again.';
  }
  return undefined;
}

export function suggestRequest(
  { inputs, edits }: AskedAbout,
  partOfSpeech: PartOfSpeech,
): SuggestRequest {
  return {
    word: inputs.word.trim(),
    pointed: inputs.pointed.trim(),
    partOfSpeech,
    definitions: filledDefinitions(inputs.definitions),
    forms: labeledForms(inputs, edits.forms ?? ''),
  };
}

// Only what is still blank as the reply lands, so typing during the call wins. The examples are
// filled as a whole, and only while every row is blank.
export function filledBlanks(
  suggestions: Suggestions,
  edits: FieldValues,
  examples: readonly Example[],
): Suggestions {
  const hints = SUGGESTED_HINTS.flatMap((field) => {
    const value = suggestions[field];
    return value !== undefined && isBlankHint(edits, field) ? [[field, value] as const] : [];
  });
  const fillsExamples = suggestions.examples !== undefined && examples.every(isBlankExample);
  return {
    ...Object.fromEntries(hints),
    ...(fillsExamples ? { examples: suggestions.examples } : {}),
  };
}

// Until the human edits what Claude wrote, so it's clear what hasn't been read yet.
export function isUnreadSuggestion(
  field: FieldKey,
  suggested: Suggestions,
  edits: FieldValues,
  examples: readonly Example[],
): boolean {
  switch (field) {
    case 'examples':
      return (
        suggested.examples !== undefined &&
        JSON.stringify(suggested.examples) === JSON.stringify(examples)
      );
    case 'productionContext':
    case 'readingContext':
      return suggested[field] !== undefined && suggested[field] === edits[field];
    default:
      return false;
  }
}
