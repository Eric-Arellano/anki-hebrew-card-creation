// Claude's review of a whole note before it's saved. It advises, and never changes a field: each
// finding names a field, and the human applies any rewrite by hand. Only the note's text goes in
// the request, never its images or audio.
import { z } from 'zod';
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import type { CheckRequest, Finding, NoteCheck } from '#lib/api/ai.ts';
import { examplesFromHtml, isBlankExample } from '#lib/card/examples.ts';
import { FIELD_HELP, GROUP_HELP } from '#lib/field-help.ts';
import { hasNiqqud, isSamePointedText } from '#lib/hebrew/normalize.ts';
import { FIELDS, type FieldKey, type FieldValues, type PartOfSpeech } from '#lib/note-type.ts';
import { askForStructured, type ClaudeMessages, type StructuredRequest } from './client.ts';
import { type Homograph, homographLines } from './homographs.ts';

// What Claude reads, in the order a card shows them. `Production answer` stays out, since it only
// repeats the word for the card to check a typed answer.
const SENT_FIELDS = [
  'unpointed',
  'pointed',
  'definitions',
  'gender',
  'binyan',
  'root',
  'forms',
  'productionContext',
  'readingContext',
  'variant1Prompt',
  'variant1Answer',
  'variant2Prompt',
  'variant2Answer',
  'examples',
  'notes',
] as const satisfies readonly FieldKey[];

// What a finding may name: the fields the human wrote, and the two a contradiction in the
// examples can call into question. The rest come from Wiktionary and are only context.
const JUDGED_FIELDS = [
  'gender',
  'binyan',
  'productionContext',
  'readingContext',
  'variant1Prompt',
  'variant1Answer',
  'variant2Prompt',
  'variant2Answer',
  'examples',
  'notes',
] as const satisfies readonly FieldKey[];

type JudgedField = (typeof JUDGED_FIELDS)[number];

// Claude names a field as the note shows it, by its Anki name.
const JUDGED_NAMES = JUDGED_FIELDS.map((key) => FIELDS[key].name) as [string, ...string[]];
const KEY_BY_NAME = new Map<string, JudgedField>(
  JUDGED_FIELDS.map((key) => [FIELDS[key].name, key]),
);

// The descriptions reach Claude with the schema, so what each field holds is said once, here.
const answerSchema = z.object({
  findings: z
    .array(
      z.object({
        field: z.enum(JUDGED_NAMES).describe('The field the problem is in.'),
        problem: z.string().describe('One short English sentence saying what is wrong and why.'),
        rewrite: z
          .string()
          .nullable()
          .describe(
            'The corrected text of just the part that is wrong, or null when no rewrite fixes ' +
              'it. For an example, its whole Hebrew sentence, then ` — `, then its English. It ' +
              'must change something: a fix that leaves the text as it is means there is no ' +
              'problem. Any Hebrew without niqqud, since the learner points it from the ' +
              'dictionary.',
          ),
      }),
    )
    .describe('One finding per problem, in the order of the fields. Empty when there are none.'),
});

type Answer = z.infer<typeof answerSchema>;

const GENDER_NAMES: Record<string, string> = { m: 'masculine', f: 'feminine', mf: 'both' };

/** Each sent field's text as the card shows it, a line per line, leaving out the blank ones. */
export function fieldTexts(fields: FieldValues): Partial<Record<FieldKey, string>> {
  return Object.fromEntries(
    SENT_FIELDS.flatMap((key) => {
      const text = (fields[key] ?? '')
        .split(/<br\s*\/?>/i)
        .map(ankiFieldHtmlToText)
        .filter((line) => line !== '')
        .join('\n');
      return text === '' ? [] : [[key, text]];
    }),
  );
}

// An example a pair of labelled lines, since a line mixing Hebrew and English after a dash is easy
// to misread: a Hebrew run's start and end can be taken for the whole of it.
function examplesBlock(html: string): string {
  const lines = examplesFromHtml(html)
    .filter((example) => !isBlankExample(example))
    .flatMap(({ hebrew, english }) => [
      `  - Hebrew: ${hebrew}`,
      ...(english === '' ? [] : [`    English: ${english}`]),
    ]);
  return [`${FIELDS.examples.name}:`, ...lines].join('\n');
}

function fieldBlock(key: FieldKey, text: string): string {
  const value = key === 'gender' ? `${text} (${GENDER_NAMES[text] ?? text})` : text;
  return value.includes('\n')
    ? `${FIELDS[key].name}:\n${value
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}`
    : `${FIELDS[key].name}: ${value}`;
}

function systemPrompt(partOfSpeech: PartOfSpeech): string {
  return [
    'You review a flashcard note that someone learning Modern Hebrew wrote for one word, just ' +
      'before they save it to their deck. They will drill whatever it says for years, and as a ' +
      'learner they can’t easily tell when its Hebrew is off. So a mistake you miss costs them, ' +
      'but so does a false alarm, which wastes their time and teaches them to doubt what is ' +
      'right. Report only problems you are confident of. Most notes have none, and then the ' +
      'right answer is no findings.',

    'How the note is studied:\n' +
      '- One card shows the Hebrew without niqqud, with the Reading context under it, and asks ' +
      'for its meaning.\n' +
      '- Another shows the Definitions, with the Production context beside them, and asks for ' +
      'the Hebrew.\n' +
      '- Each variant is a card of its own: its prompt is shown, in English, and its answer is ' +
      'the Hebrew to recall.\n' +
      '- The Examples show under the answer, each Hebrew sentence with its English under it.\n' +
      '- The Notes show under the answer too.\n' +
      'The word, its niqqud, Definitions, Gender, Binyan, Root and Forms come from Wiktionary. ' +
      'The other fields the learner wrote, with this help beside each:\n' +
      `- Production context: ${FIELD_HELP.productionContext[partOfSpeech]}\n` +
      `- Reading context: ${FIELD_HELP.readingContext[partOfSpeech]}\n` +
      `- Variants: ${GROUP_HELP['Unusual variants']}\n` +
      `- Examples: ${FIELD_HELP.examples[partOfSpeech]}\n` +
      `- Notes: ${FIELD_HELP.notes}`,

    'Look for these, and nothing else:\n' +
      '- Hebrew in the Examples, the Reading context or a variant’s answer that is wrong, or ' +
      'that a native speaker in today’s Israel wouldn’t say: a wrong word, a wrong agreement or ' +
      'preposition, or stilted phrasing.\n' +
      '- An example whose English doesn’t say what its Hebrew says.\n' +
      '- An example that uses the word in a sense the Definitions don’t give.\n' +
      '- A hint that gives its answer away: a Production context that holds the Hebrew word or ' +
      'one of its forms, or a Reading context that translates the word. A Reading context that ' +
      'reads just as well as one of the other words the spelling could be, when those are ' +
      'listed, fails too.\n' +
      '- A variant whose answer doesn’t answer its prompt.\n' +
      '- A Gender or Binyan that an example contradicts, like an adjective agreeing as if the ' +
      'noun were the other gender. Report it under the field you think is wrong.\n' +
      '- A note that is wrong about the word, its usage or its spelling.',

    'Leave these alone:\n' +
      '- Niqqud. It comes from Wiktionary, so never comment on it, nor on where it is missing.\n' +
      '- The facts from Wiktionary, except where an example contradicts them as above.\n' +
      '- A blank field. Blank fields are left out below, and leaving one blank is the learner’s ' +
      'choice, so never ask for one to be filled.\n' +
      '- Hebrew that is correct and natural, even where you would have phrased it differently, ' +
      'and the choice of examples.\n' +
      '- Spelling without niqqud, where the full and the defective spelling are both in use.',

    'Answer with your findings in the schema given, whose fields say what each holds.',
  ].join('\n\n');
}

export function checkRequest(
  { partOfSpeech, fields }: CheckRequest,
  homographs: readonly Homograph[],
): StructuredRequest<Answer> {
  const texts = fieldTexts(fields);
  const user = [
    `Part of speech: ${partOfSpeech}`,
    ...SENT_FIELDS.flatMap((key) => {
      const text = texts[key];
      if (text === undefined) return [];
      return [key === 'examples' ? examplesBlock(fields.examples ?? '') : fieldBlock(key, text)];
    }),
    ...(homographs.length === 0 ? [] : [homographLines(homographs)]),
  ].join('\n');
  return { system: systemPrompt(partOfSpeech), user, schema: answerSchema };
}

// Plain text, since the review shows it as it is.
function isPlainLine(text: string): boolean {
  return text.trim() !== '' && !/[<>\r\n]/.test(text);
}

// Compared after NFC, with runs of space as one and any dash between spaces as an em dash, so an
// example's rewrite compares with its line as `fieldTexts` gives it.
function comparable(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/ [-–—] /g, ' — ')
    .trim();
}

// A rewrite of a field's line into that same line means Claude misread the field, which is what
// its problem then describes.
function repeatsField(rewrite: string, text: string): boolean {
  return text.split('\n').some((line) => isSamePointedText(comparable(line), comparable(rewrite)));
}

/**
 * The findings in `answer` that name a field the note holds text in. A rewrite that isn't a plain
 * line, or carries niqqud, which a model can't be trusted to point, is dropped from its finding.
 */
export function toNoteCheck(answer: Answer, fields: FieldValues): NoteCheck {
  const texts = fieldTexts(fields);
  const findings = answer.findings.flatMap(({ field: name, problem, rewrite }): Finding[] => {
    const field = KEY_BY_NAME.get(name);
    const text = field === undefined ? undefined : texts[field];
    if (field === undefined || text === undefined || !isPlainLine(problem)) return [];
    if (rewrite != null && repeatsField(rewrite, text)) return [];
    const keepsRewrite = rewrite != null && isPlainLine(rewrite) && !hasNiqqud(rewrite);
    return [
      { field, problem: problem.trim(), ...(keepsRewrite ? { rewrite: rewrite.trim() } : {}) },
    ];
  });
  return { findings };
}

export async function checkNote(
  request: CheckRequest,
  homographs: readonly Homograph[],
  messages?: ClaudeMessages,
): Promise<NoteCheck> {
  return toNoteCheck(
    await askForStructured(checkRequest(request, homographs), messages),
    request.fields,
  );
}
