import { z } from 'zod';
import raw from '../../config.json' with { type: 'json' };

const nonEmpty = z.string().min(1);

/** Rejects a template that uses a `{placeholder}` outside `allowed`, or none of them. */
function template(allowed: readonly string[]) {
  return nonEmpty.refine(
    (value) => {
      const used = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '');
      return used.length > 0 && used.every((name) => allowed.includes(name));
    },
    { error: `must use only the placeholders ${allowed.map((name) => `{${name}}`).join(', ')}` },
  );
}

function distinct(values: string[]): boolean {
  return new Set(values).size === values.length;
}

// Relative to the repo, so config never carries a home path.
const repoPath = nonEmpty.refine((value) => !/^([/\\~]|[A-Za-z]:)/.test(value), {
  error: 'must be relative to the repo',
});

const configSchema = z.strictObject({
  anki: z.strictObject({
    // The API key goes wherever this points, so it may only point at this machine.
    url: z.url({ protocol: /^http$/, hostname: /^(127\.0\.0\.1|localhost)$/ }),
    deck: nonEmpty,
    noteType: nonEmpty,
    tags: z.array(nonEmpty),
  }),
  fields: z
    .strictObject({
      unpointed: nonEmpty,
      pointed: nonEmpty,
      productionAnswer: nonEmpty,
      definitions: nonEmpty,
      productionContext: nonEmpty,
      readingContext: nonEmpty,
      images: nonEmpty,
      audio: nonEmpty,
      gender: nonEmpty,
      forms: nonEmpty,
      binyan: nonEmpty,
      root: nonEmpty,
      variant1Prompt: nonEmpty,
      variant1Answer: nonEmpty,
      variant2Prompt: nonEmpty,
      variant2Answer: nonEmpty,
      examples: nonEmpty,
      notes: nonEmpty,
    })
    .refine((fields) => distinct(Object.values(fields)), { error: 'field names must be distinct' }),
  gender: z
    .strictObject({ m: nonEmpty, f: nonEmpty, both: nonEmpty })
    .refine((gender) => distinct(Object.values(gender)), {
      error: 'gender values must be distinct',
    }),
  tov: z.strictObject({
    unpointed: z.strictObject({ m: nonEmpty, f: nonEmpty }),
    pointed: z.strictObject({
      m: z.strictObject({ sg: nonEmpty, pl: nonEmpty }),
      f: z.strictObject({ sg: nonEmpty, pl: nonEmpty }),
    }),
  }),
  productionAnswer: z.strictObject({
    noun: template(['word', 'tov']),
    verb: template(['word', 'preposition']),
  }),
  forms: z.strictObject({
    separator: nonEmpty,
    labels: z.strictObject({
      plural: nonEmpty,
      feminine: nonEmpty,
      mascPlural: nonEmpty,
      femPlural: nonEmpty,
    }),
  }),
  root: z.strictObject({ separator: nonEmpty }),
  binyanim: z
    .array(z.strictObject({ value: nonEmpty, aliases: z.array(nonEmpty) }))
    .min(1)
    // An alias that names two binyanim would make conversion a guess.
    .refine((binyanim) => distinct(binyanim.flatMap((b) => [b.value, ...b.aliases])), {
      error: 'binyan values and aliases must be distinct',
    }),
  // The prepositions a verb governs, which its production answer carries so I learn the word
  // with it: `לחכות ל`, `לפחד מ`. את is left out on purpose. It is the default, and a verb
  // that takes a direct object gets no preposition at all: `לראות`, not `לראות את`.
  prepositions: z.array(nonEmpty).min(1),
  links: z
    .array(
      z.strictObject({
        id: nonEmpty,
        label: nonEmpty,
        template: template(['word', 'gloss']).refine((value) => value.startsWith('https://'), {
          error: 'must be an https URL',
        }),
        check: z.boolean(),
      }),
    )
    .refine((links) => distinct(links.map((link) => link.id)), {
      error: 'link ids must be distinct',
    }),
  linkCheck: z.strictObject({
    userAgent: nonEmpty,
    minIntervalMs: z.int().nonnegative(),
    timeoutMs: z.int().positive(),
  }),
  definitions: z.strictObject({ prefillFromDictionary: z.boolean() }),
  dictionary: z.strictObject({ jsonl: repoPath, index: repoPath }),
});

export type Config = z.infer<typeof configSchema>;

export function parseConfig(value: unknown): Config {
  return configSchema.parse(value);
}

export const config = parseConfig(raw);
