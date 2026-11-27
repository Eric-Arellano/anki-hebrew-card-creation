// `npm run eval -- <check|verb-meanings|suggest> [efforts] [runs]`: asks the real Claude, at each
// effort, about every case of that kind in `cases.ts`, and prints what it got wrong and what it
// cost. Every call is billed, so this runs only when the human asks: the check, three efforts and
// two runs cost about $3. Set EVAL_VERBOSE to print every answer, not just the wrong ones, and
// EVAL_ONLY to run only the cases whose name holds it.
//
// It calls the same functions as the app's routes, so it grades what the editor would show,
// guards included. Only the effort is swapped, on its way to the API.
import Anthropic from '@anthropic-ai/sdk';
import type { FieldKey } from '#lib/note-type.ts';
import { checkNote } from '#lib/server/ai/check.ts';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { suggest } from '#lib/server/ai/suggest.ts';
import { suggestVerbMeanings } from '#lib/server/ai/verb-meanings.ts';
import {
  CHECK_CASES,
  type CheckCase,
  SUGGEST_CASES,
  type SuggestCase,
  VERB_MEANINGS_CASES,
  type VerbMeaningsCase,
} from './cases.ts';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

// Claude Opus 5.5's price per token, for an estimate. Check it against Anthropic's pricing page.
const DOLLARS_PER_INPUT_TOKEN = 4 / 1e6;
const DOLLARS_PER_OUTPUT_TOKEN = 20 / 1e6;

type Usage = { dollars: number; seconds: number; thinkingTokens: number };

// The real client, with `effort` in place of the app's, and what each call cost.
function measuredClaude(effort: Effort): { messages: ClaudeMessages; usage: Usage[] } {
  const real = new Anthropic().beta.messages;
  const usage: Usage[] = [];
  return {
    usage,
    messages: {
      async create(params) {
        const started = performance.now();
        const message = await real.create({
          ...params,
          output_config: { ...params.output_config, effort },
        });
        const { input_tokens, output_tokens, output_tokens_details } = message.usage;
        usage.push({
          dollars:
            input_tokens * DOLLARS_PER_INPUT_TOKEN + output_tokens * DOLLARS_PER_OUTPUT_TOKEN,
          seconds: (performance.now() - started) / 1000,
          thinkingTokens: output_tokens_details?.thinking_tokens ?? 0,
        });
        return message;
      },
    },
  };
}

// What one answer got wrong, none when it is right, and the answer itself as lines to read.
type Graded = { problems: string[]; lines: string[] };

async function gradeCheck(
  { name, request, homographs, faults }: CheckCase,
  messages: ClaudeMessages,
): Promise<Graded> {
  const { findings } = await checkNote(request, homographs, messages);
  const flagged = new Set<FieldKey>(findings.map(({ field }) => field));
  const missed = faults.filter((field) => !flagged.has(field));
  const unexpected = findings.filter(({ field }) => !faults.includes(field));
  return {
    problems: [
      ...(missed.length === 0 ? [] : [`MISSED ${name}: ${missed.join(', ')}`]),
      ...unexpected.map(
        ({ field, problem }) =>
          `${faults.length === 0 ? 'FALSE ALARM' : 'ALSO'} ${name}: ${field}: ${problem}`,
      ),
    ],
    lines: [
      `${name}:`,
      ...findings.map(({ field, problem, rewrite }) => `  ${field}: ${problem} → ${rewrite ?? ''}`),
    ],
  };
}

async function gradeVerbMeanings(
  { name, request, expected }: VerbMeaningsCase,
  messages: ClaudeMessages,
): Promise<Graded> {
  const { meanings } = await suggestVerbMeanings(request, messages);
  const problems = expected.flatMap((want) => {
    const matching = meanings.filter(({ english }) => english.includes(want.meaning));
    if (matching.length === 0) return [`MISSING ${name}: no meaning with “${want.meaning}”`];
    return matching.flatMap(({ english, preposition }) =>
      want.takes.includes(preposition) ? [] : [`WRONG ${name}: “${english}” takes ${preposition}`],
    );
  });
  const lines = [
    `${name}:`,
    ...meanings.map(
      ({ english, preposition, usage }) => `  ${english} [${preposition}] ${usage ?? ''}`,
    ),
  ];
  return { problems, lines };
}

// Suggestions have no right answer to grade against, so these are only read.
async function readSuggestions(
  { request, homographs }: SuggestCase,
  messages: ClaudeMessages,
): Promise<Graded> {
  const {
    examples = [],
    productionContext,
    readingContext,
  } = await suggest(request, homographs, messages);
  const lines = [
    `${request.word}:`,
    ...examples.map(({ hebrew, english }) => `  ${hebrew} | ${english}`),
    `  Production context: ${productionContext ?? '(none)'}`,
    ...(homographs.length === 0 ? [] : [`  Reading context: ${readingContext ?? '(none)'}`]),
  ];
  return { problems: [], lines };
}

type Grader = (messages: ClaudeMessages) => Promise<Graded>;

function only<C>(cases: C[], name: (c: C) => string): C[] {
  const wanted = process.env.EVAL_ONLY;
  return wanted === undefined ? cases : cases.filter((c) => name(c).includes(wanted));
}

const GRADERS: Record<string, () => Grader[]> = {
  check: () => only(CHECK_CASES, (c) => c.name).map((c) => (messages) => gradeCheck(c, messages)),
  'verb-meanings': () =>
    only(VERB_MEANINGS_CASES, (c) => c.name).map(
      (c) => (messages) => gradeVerbMeanings(c, messages),
    ),
  suggest: () =>
    only(SUGGEST_CASES, (c) => c.request.word).map(
      (c) => (messages) => readSuggestions(c, messages),
    ),
};

// A few calls at a time, so a run finishes in a minute without tripping the rate limit.
async function inPool<T>(jobs: (() => Promise<T>)[], size = 6): Promise<T[]> {
  const queue = jobs.map((job, index) => ({ job, index }));
  const results: T[] = new Array(jobs.length);
  async function work() {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      results[next.index] = await next.job();
    }
  }
  await Promise.all(Array.from({ length: size }, work));
  return results;
}

function repeated<C>(cases: C[], runs: number): C[] {
  return Array.from({ length: runs }, () => cases).flat();
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const [kind = '', effortList = 'low,medium,high', runsArg = '1'] = process.argv.slice(2);
const graders = GRADERS[kind]?.();
if (graders === undefined) {
  const kinds = Object.keys(GRADERS).join('|');
  console.error(`Usage: npm run eval -- <${kinds}> [low,medium,high] [runs]`);
  process.exit(1);
}
const showAnswers = kind === 'suggest' || process.env.EVAL_VERBOSE !== undefined;

for (const effort of effortList.split(',') as Effort[]) {
  const { messages, usage } = measuredClaude(effort);
  const graded = await inPool(
    repeated(graders, Number(runsArg)).map((grade) => () => grade(messages)),
  );
  const right = graded.filter(({ problems }) => problems.length === 0).length;
  const summary = [
    `\n## ${effort}`,
    `$${average(usage.map((u) => u.dollars)).toFixed(4)} a call`,
    `${average(usage.map((u) => u.seconds)).toFixed(1)}s`,
    `${Math.round(average(usage.map((u) => u.thinkingTokens)))} thinking tokens`,
    ...(kind === 'suggest' ? [] : [`${right}/${graded.length} right`]),
  ];
  console.log(summary.join(' · '));
  for (const { problems, lines } of graded) {
    for (const line of [...problems, ...(showAnswers ? lines : [])]) console.log(`  ${line}`);
  }
}
