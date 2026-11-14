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

// Where my Hebrew is now, on the CEFR scale. Raise it as I learn, so examples grow with me.
const LEARNER_LEVEL = 'A1';

type FixedPartOfSpeech = 'adverb' | 'phrase';

// A menu, not a checklist: a second example should differ from the first, not cover every form.
// No ש before a noun, since it makes a second clause.
const OTHER_FORMS: Record<Exclude<PartOfSpeech, FixedPartOfSpeech>, string | null> = {
  noun: 'the plural, or ה, ב, ל, מ or ו before it',
  verb: 'another person or tense, or the infinitive after a verb like רוצה or צריך',
  adjective: 'agreeing with a feminine or a plural noun',
  preposition: 'with a pronoun ending',
  other: null,
};

function formVariety(partOfSpeech: PartOfSpeech): string {
  if (partOfSpeech === 'adverb' || partOfSpeech === 'phrase') {
    return 'Its form never changes, so make each sentence a different kind from the others.';
  }
  const options = OTHER_FORMS[partOfSpeech];
  return (
    'You needn’t show every form. Just don’t repeat one: each sentence after the first uses ' +
    'the word in a form the others haven’t, whichever fits a simple sentence, from the forms ' +
    (options === null ? 'listed.' : `listed or ${options}.`)
  );
}

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
      '- Write full sentences a native speaker would say in daily life, each about one thing: ' +
      'the word. Its sentence should show what the word means, and nothing else should compete ' +
      'with it for attention.\n' +
      `- The learner’s Hebrew is around ${LEARNER_LEVEL}. Keep everything but the word at that ` +
      'level: one short clause of about three to six words, a common verb, and no added ' +
      'detail like when, where or why unless it is what shows the meaning. A word beyond ' +
      `${LEARNER_LEVEL} is fine when the sentence needs it to be real, but use it only then.\n` +
      '- Let the word do the work, not a place or object beside it. For חתול, ' +
      '“החתול ישן.” (The cat is sleeping.) or “יש לי חתול.” (I have a cat.) beat ' +
      '“החתול ישן על הספה בסלון.” (The cat is sleeping on the sofa in the living room.), ' +
      'where the sofa and the room take over.\n' +
      `- ${formVariety(partOfSpeech)}\n` +
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
