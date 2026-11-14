// Claude's suggestions for the fields the dictionary can't fill. Only the word, its meanings, its
// forms and its homographs' meanings go in the request.
import { z } from 'zod';
import type { Suggestions, SuggestRequest } from '#lib/api/ai.ts';
import type { Example } from '#lib/card/examples.ts';
import { FIELD_HELP } from '#lib/field-help.ts';
import { hasHebrewLetters, hasLatinLetters } from '#lib/hebrew/letters.ts';
import { hasNiqqud } from '#lib/hebrew/normalize.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';
import { askForStructured, type ClaudeMessages, type StructuredRequest } from './client.ts';
import { type Homograph, homographLines } from './homographs.ts';

const exampleSchema = z.object({ hebrew: z.string(), english: z.string() });
const answerSchema = z.object({
  examples: z.array(exampleSchema),
  productionContext: z.string().nullable(),
});
// Asked for only when there are homographs to tell apart, so Claude never invents one.
const answerWithReadingSchema = answerSchema.extend({ readingContext: z.string().nullable() });

type Answer = z.infer<typeof answerSchema> & { readingContext?: string | null };

// Enforced on the answer too, since a row per example soon gets noisy.
const MAX_EXAMPLES = 4;

const FORM_VARIETY: Record<PartOfSpeech, string> = {
  noun:
    'Use the word in a different form in each, preferring the forms listed: with ה, ב, ל, מ, ו ' +
    'or ש before it, or in the plural.',
  verb:
    'Use the word in a different form in each, preferring the forms listed: in another person ' +
    'or tense, or as the infinitive after a verb like רוצה or צריך.',
  adjective:
    'Use the word in a different form in each, preferring the forms listed: agreeing with a ' +
    'feminine or a plural noun.',
  preposition:
    'Use the word in a different form in each, preferring the forms listed: with a pronoun ' +
    'ending.',
  adverb: 'Its form never changes, so use it in a different kind of sentence each time.',
  phrase: 'Its form never changes, so use it in a different kind of sentence each time.',
  other: 'Use the word in a different form in each, preferring the forms listed.',
};

export function suggestionRequest(
  { word, pointed, partOfSpeech, definitions, forms }: SuggestRequest,
  homographs: readonly Homograph[],
): StructuredRequest<Answer> {
  const withReading = homographs.length > 0;
  const system = [
    'You help someone learning Modern Hebrew write flashcards for one word, by filling in ' +
      'fields they would otherwise write themselves. Each field comes with the help they see.',
    '- Write the Hebrew of today’s Israel, as a native speaker says it, and without niqqud.\n' +
      '- Use the word in the sense its meanings give.\n' +
      '- Write plain text, with no HTML and no line breaks.',
    `Examples: ${FIELD_HELP.examples[partOfSpeech]}\n` +
      '- Write full sentences a native speaker would say in daily life: short, about four to ' +
      'eight words, with everyday words a beginner knows.\n' +
      `- ${FORM_VARIETY[partOfSpeech]}\n` +
      '- A few good sentences beat many. Write one for each distinct meaning, in their order, ' +
      'so its English shows which meaning it uses. Meanings that are shades of one sense share ' +
      'a sentence, and one marked archaic, obsolete or rare needs none. With only one meaning ' +
      `left, write two. Never write more than ${MAX_EXAMPLES}.\n` +
      '- End every sentence with `.`, `?` or `!`, in Hebrew and in English. Put the Hebrew in ' +
      '`hebrew`, and a natural English translation in `english`, without parentheses.',
    `Production context: ${FIELD_HELP.productionContext[partOfSpeech]}\n` +
      'Write it in English, with no Hebrew. Answer null when no other common Hebrew word shares ' +
      'these meanings.',
    ...(withReading
      ? [
          `Reading context: ${FIELD_HELP.readingContext[partOfSpeech]}\n` +
            'Write it in Hebrew, with no English, so it tells the word apart from the other ' +
            'words its spelling could be, which are listed with it. Answer null when you can’t.',
        ]
      : []),
  ].join('\n\n');

  const user = [
    `Word: ${word}`,
    ...(pointed.trim() === '' ? [] : [`With niqqud: ${pointed}`]),
    `Part of speech: ${partOfSpeech}`,
    `Meanings:\n${definitions.map((meaning) => `- ${meaning}`).join('\n')}`,
    ...(forms.length === 0
      ? []
      : [
          `Forms:\n${forms
            .map(({ label, form }) => (label === '' ? `- ${form}` : `- ${label}: ${form}`))
            .join('\n')}`,
        ]),
    ...(withReading ? [homographLines(homographs)] : []),
  ].join('\n');

  return { system, user, schema: withReading ? answerWithReadingSchema : answerSchema };
}

// A hint's textarea is saved as Anki HTML, where `<`, `>` and `&` would be markup, and a line
// break would split one suggestion into two.
function isPlainLine(text: string): boolean {
  return text.trim() !== '' && !/[<>&\r\n]/.test(text);
}

// Unpointed, because pointing from a model isn't a source the Hebrew text rules can trust.
function isUnpointedHebrew(text: string): boolean {
  return isPlainLine(text) && hasHebrewLetters(text) && !hasLatinLetters(text) && !hasNiqqud(text);
}

function isValidExample({ hebrew, english }: Example): boolean {
  return (
    isUnpointedHebrew(hebrew) &&
    isPlainLine(english) &&
    !hasHebrewLetters(english) &&
    !/[()]/.test(english)
  );
}

/** What of `answer` passes the guards, as each field's input holds it. */
export function toSuggestions(answer: Answer): Suggestions {
  const examples = answer.examples
    .filter(isValidExample)
    .slice(0, MAX_EXAMPLES)
    .map(({ hebrew, english }) => ({ hebrew: hebrew.trim(), english: english.trim() }));
  const { productionContext, readingContext } = answer;
  return {
    ...(examples.length === 0 ? {} : { examples }),
    // Hebrew in the hint would give the answer away.
    ...(productionContext != null &&
    isPlainLine(productionContext) &&
    !hasHebrewLetters(productionContext)
      ? { productionContext: productionContext.trim() }
      : {}),
    // English in the hint would translate the word.
    ...(readingContext != null && isUnpointedHebrew(readingContext)
      ? { readingContext: readingContext.trim() }
      : {}),
  };
}

export async function suggest(
  request: SuggestRequest,
  homographs: readonly Homograph[],
  messages?: ClaudeMessages,
): Promise<Suggestions> {
  return toSuggestions(await askForStructured(suggestionRequest(request, homographs), messages));
}
