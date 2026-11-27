// Claude's suggestions for a verb's meanings, each with the preposition it takes. Only the verb, the
// human's meanings and the picked entry's definitions go in the request.
//
// Claude answers the whole list, and says which of the human's lines each meaning keeps or splits,
// so the editor can show what changed and let the human take only part of it.
// *Rejected: asking only for the prepositions of the human's lines, because the meanings worth
// adding are the ones a learner wouldn't think to write, like “to look after” for שמר.*
import { z } from 'zod';
import type {
  SuggestedVerbMeaning,
  VerbMeaningSuggestions,
  VerbMeaningsRequest,
} from '#lib/api/ai.ts';
import { type Meaning, PREPOSITION_CHOICES } from '#lib/card/definitions.ts';
import { VERB_MEANING_PREPOSITION_HELP } from '#lib/field-help.ts';
import { hasHebrewLetters } from '#lib/hebrew/letters.ts';
import { askForStructured, type ClaudeMessages, type StructuredRequest } from './client.ts';
import { isPlainLine, isUnpointedHebrew } from './plain-text.ts';

// `usage` comes before `preposition`, so Claude writes the phrase before naming what it shows.
const answerSchema = z.object({
  meanings: z.array(
    z.object({
      from: z.number().int().nullable(),
      english: z.string(),
      usage: z.string(),
      preposition: z.enum(PREPOSITION_CHOICES),
      note: z.string().nullable(),
    }),
  ),
});

type Answer = z.infer<typeof answerSchema>;

/** A verb's meanings as every prompt shows them: numbered, each with its unpointed preposition. */
export function verbMeaningLines(meanings: readonly Meaning[]): string {
  return meanings
    .map(
      ({ english, preposition }, index) =>
        `${index + 1}. ${english} [${preposition ?? 'not chosen'}]`,
    )
    .join('\n');
}

const HELP = [
  VERB_MEANING_PREPOSITION_HELP.lead,
  ...VERB_MEANING_PREPOSITION_HELP.cases.map((line) => `- ${line}`),
].join('\n');

// Each rule here is one Claude broke in trials without it: את for חשב, את for the language after
// מדבר, ב for where you work, the dictionary's every sense of עבד, and a None the human chose
// replaced where מ fits too.
const SYSTEM = [
  'You help someone learning Modern Hebrew write a flashcard for one verb. The card lists the ' +
    'verb’s English meanings, each with the preposition the verb takes in that meaning, and ' +
    'quizzes the learner on each preposition. This is the help they see when they choose one:\n\n' +
    HELP,
  'Prepositions:\n' +
    '- Give the preposition that comes right after the verb in that meaning, before its object, ' +
    'as a native speaker in today’s Israel says it. A place you go to counts as an object: ' +
    'ללכת takes ל, from הלכתי לים. A place where it happens doesn’t, so “to work” in ' +
    'עובד בבנק takes none, unless the verb needs it, as גר needs ב.\n' +
    '- For a direct object it is את, even though את drops before an indefinite one: “to see” ' +
    'takes את, from ראיתי את הסרט, even though ראיתי סרט has none. Give את only where a native ' +
    'speaker would say it before a definite object, so never for the language after מדבר.\n' +
    '- An infinitive or a ש clause after the verb isn’t an object: “to want” takes את, from ' +
    'רוצה את הספר, even though רוצה לאכול has none.\n' +
    '- Answer none only for a meaning that never takes an object, like “to sleep”.',
  'The learner’s lines, each ending in the preposition they chose, if any:\n' +
    '- Keep each of them, in order, with its wording, and set `from` to its number.\n' +
    '- Keep a preposition they chose unless the verb never takes it in that meaning. Where ' +
    'another would fit too, keep theirs.\n' +
    '- Split a line in place when its roles take different prepositions a beginner meets often, ' +
    'as “to talk” becomes “to talk with” עם and “to talk about” על. Give each part the line’s ' +
    'number in `from`.\n' +
    '- After them, add a meaning only when a different preposition gives it, and a beginner ' +
    'would meet it in everyday speech, like “to look after” על beside “to keep” את. Set `from` ' +
    'to null. Most verbs need none added, and never add more than two.\n' +
    '- With no lines yet, write the meanings a beginner would meet in everyday speech, from the ' +
    'dictionary’s definitions, most common first, and set `from` to null. Leave out a sense that ' +
    'is formal, literary, slang, religious, archaic or rare, even when the dictionary doesn’t ' +
    'mark it. Where the verb takes a different preposition for the person than for the thing, ' +
    'like לספר, give each its own line.\n' +
    '- Keep the card short: shades of one sense with the same preposition share a line, and most ' +
    'verbs need one to three lines.',
  'For each meaning:\n' +
    '- `english`: as the deck writes it: English starting “to”, short, with commas between ' +
    'shades of one sense (“to walk, go”), and the English preposition when it tells roles apart ' +
    '(“to talk with”). No Hebrew.\n' +
    '- `usage`: a short everyday phrase in Hebrew, without niqqud, using the verb in this ' +
    'meaning with exactly this preposition before its object, like שומר על הילדים. For את, make ' +
    'the object definite so את shows. With none, the verb in a short phrase.\n' +
    '- `note`: null, unless you changed a preposition the learner chose, or another preposition ' +
    'is as common in this meaning. Then say so in a few words of English, naming the Hebrew ' +
    'preposition.',
].join('\n\n');

export function verbMeaningsPrompt({
  word,
  pointed,
  meanings,
  dictionaryDefinitions,
  dictionaryPrepositions,
}: VerbMeaningsRequest): StructuredRequest<Answer> {
  const user = [
    `Verb: ${word}`,
    ...(pointed.trim() === '' ? [] : [`With niqqud: ${pointed}`]),
    ...(dictionaryDefinitions.length === 0
      ? []
      : [
          `Dictionary definitions:\n${dictionaryDefinitions.map((gloss) => `- ${gloss}`).join('\n')}`,
        ]),
    ...(dictionaryPrepositions.length === 0
      ? []
      : [
          'Prepositions the dictionary names for the verb, though not for which meaning: ' +
            dictionaryPrepositions.join(', '),
        ]),
    meanings.length === 0
      ? 'The learner has written no lines yet.'
      : `The learner’s lines:\n${verbMeaningLines(meanings)}`,
  ].join('\n');
  return { system: SYSTEM, user, schema: answerSchema };
}

/**
 * What of `answer` passes the guards, with Claude's 1-based `from` turned into a `fromIndex` among
 * the `lineCount` lines asked about. A meaning whose English fails is dropped; a usage or note
 * that fails is left off.
 */
export function toVerbMeaningSuggestions(
  answer: Answer,
  lineCount: number,
): VerbMeaningSuggestions {
  const meanings = answer.meanings.flatMap(
    ({ from, english, usage, preposition, note }): SuggestedVerbMeaning[] => {
      if (!isPlainLine(english) || hasHebrewLetters(english)) return [];
      // A number that names none of the lines is a meaning Claude added.
      const index = from !== null && from >= 1 && from <= lineCount ? from - 1 : undefined;
      return [
        {
          english: english.trim(),
          preposition,
          ...(index === undefined ? {} : { fromIndex: index }),
          ...(isUnpointedHebrew(usage) ? { usage: usage.trim() } : {}),
          ...(note !== null && isPlainLine(note) ? { note: note.trim() } : {}),
        },
      ];
    },
  );
  return { meanings };
}

export async function suggestVerbMeanings(
  request: VerbMeaningsRequest,
  messages?: ClaudeMessages,
): Promise<VerbMeaningSuggestions> {
  const answer = await askForStructured(verbMeaningsPrompt(request), messages);
  return toVerbMeaningSuggestions(answer, request.meanings.length);
}
