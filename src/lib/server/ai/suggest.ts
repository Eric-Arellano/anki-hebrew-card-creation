// Claude's suggestions for the fields the dictionary can't fill. Only the word, its meanings and
// its homographs' meanings go in the request.
import { z } from 'zod';
import type { Suggestions, SuggestRequest } from '#lib/api/ai.ts';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import { FIELD_HELP } from '#lib/field-help.ts';
import { hasHebrewLetters, hasLatinLetters } from '#lib/hebrew/letters.ts';
import { hasNiqqud, isSamePointedText, toLookupKey } from '#lib/hebrew/normalize.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';
import { askForStructured, type ClaudeMessages, type StructuredRequest } from './client.ts';

export type Homograph = { pointed: string; partOfSpeech: PartOfSpeech; definitions: string[] };

/**
 * The other words `word` could be read as without niqqud: the entries titled with its spelling
 * whose pointing isn't `pointed`. None when `pointed` is blank, since then nothing tells the
 * note's own entry apart.
 */
export function homographsOf(lookup: DictionaryLookup, word: string, pointed: string): Homograph[] {
  if (lookup.match !== 'exact' || pointed.trim() === '') return [];
  // A lemma the lookup reached through one of its forms isn't a reading of this spelling: `כלב`
  // finds `כַּלְבָּה` through its masculine, and `לדבר` finds `דִּבֵּר`, the verb's own entry.
  const key = toLookupKey(word);
  return lookup.candidates.flatMap((candidate) =>
    candidate.pointed !== undefined &&
    toLookupKey(candidate.title) === key &&
    !isSamePointedText(candidate.pointed, pointed)
      ? [
          {
            pointed: candidate.pointed,
            partOfSpeech: candidate.partOfSpeech,
            definitions: candidate.definitions,
          },
        ]
      : [],
  );
}

const exampleSchema = z.object({ hebrew: z.string(), english: z.string() });
const answerSchema = z.object({
  examples: z.array(exampleSchema),
  productionContext: z.string().nullable(),
});
// Asked for only when there are homographs to tell apart, so Claude never invents one.
const answerWithReadingSchema = answerSchema.extend({ readingContext: z.string().nullable() });

type Answer = z.infer<typeof answerSchema> & { readingContext?: string | null };

export function suggestionRequest(
  { word, pointed, partOfSpeech, definitions }: SuggestRequest,
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
      'Give two or three short ones, each using the word in some form. Put the Hebrew in ' +
      '`hebrew`, with no punctuation at its end, and its English in `english`, without ' +
      'parentheses.',
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
    ...(withReading
      ? [
          'Without niqqud, its spelling could also be:\n' +
            homographs
              .map(
                (homograph) =>
                  `- ${homograph.pointed} (${homograph.partOfSpeech}): ` +
                  homograph.definitions.join('; '),
              )
              .join('\n'),
        ]
      : []),
  ].join('\n');

  return { system, user, schema: withReading ? answerWithReadingSchema : answerSchema };
}

// A textarea's text is saved as Anki HTML, where `<`, `>` and `&` would be markup, and a line
// break would split one suggestion into two.
function isPlainLine(text: string): boolean {
  return text.trim() !== '' && !/[<>&\r\n]/.test(text);
}

// Unpointed, because pointing from a model isn't a source the Hebrew text rules can trust.
function isUnpointedHebrew(text: string): boolean {
  return isPlainLine(text) && hasHebrewLetters(text) && !hasLatinLetters(text) && !hasNiqqud(text);
}

// In the form the Examples help shows, `Hebrew (English)`, one per line.
function exampleLine({ hebrew, english }: z.infer<typeof exampleSchema>): string[] {
  const valid =
    isUnpointedHebrew(hebrew) &&
    isPlainLine(english) &&
    !hasHebrewLetters(english) &&
    !/[()]/.test(english);
  return valid ? [`${hebrew.trim()} (${english.trim()})`] : [];
}

/** What of `answer` passes the guards, as each field's textarea holds it. */
export function toSuggestions(answer: Answer): Suggestions {
  const examples = answer.examples.flatMap(exampleLine).join('\n');
  const { productionContext, readingContext } = answer;
  return {
    ...(examples === '' ? {} : { examples }),
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
