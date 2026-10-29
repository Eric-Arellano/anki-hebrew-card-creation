import { z } from 'zod';
import rawConfig from '../../config.json' with { type: 'json' };

const nonEmptyString = z.string().min(1);

/** Rejects a template that uses a `{placeholder}` outside `allowedPlaceholders`, or none of them. */
function placeholderTemplate(allowedPlaceholders: readonly string[]) {
  return nonEmptyString.refine(
    (value) => {
      const usedPlaceholders = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '');
      return (
        usedPlaceholders.length > 0 &&
        usedPlaceholders.every((name) => allowedPlaceholders.includes(name))
      );
    },
    {
      error: `must use only the placeholders ${allowedPlaceholders.map((name) => `{${name}}`).join(', ')}`,
    },
  );
}

function allDistinct(values: string[]): boolean {
  return new Set(values).size === values.length;
}

// Relative to the repo, so config never carries a home path.
const repoRelativePath = nonEmptyString.refine((value) => !/^([/\\~]|[A-Za-z]:)/.test(value), {
  error: 'must be relative to the repo',
});

const configSchema = z.strictObject({
  anki: z.strictObject({
    // Card contents go wherever this points, so it may only point at this machine.
    url: z.url({ protocol: /^http$/, hostname: /^(127\.0\.0\.1|localhost)$/ }),
    deck: nonEmptyString,
    noteType: nonEmptyString,
    tags: z.array(nonEmptyString),
  }),
  fields: z
    .strictObject({
      unpointed: nonEmptyString,
      pointed: nonEmptyString,
      productionAnswer: nonEmptyString,
      definitions: nonEmptyString,
      productionContext: nonEmptyString,
      readingContext: nonEmptyString,
      images: nonEmptyString,
      audio: nonEmptyString,
      gender: nonEmptyString,
      forms: nonEmptyString,
      binyan: nonEmptyString,
      root: nonEmptyString,
      variant1Prompt: nonEmptyString,
      variant1Answer: nonEmptyString,
      variant2Prompt: nonEmptyString,
      variant2Answer: nonEmptyString,
      examples: nonEmptyString,
      notes: nonEmptyString,
    })
    .refine((fields) => allDistinct(Object.values(fields)), {
      error: 'field names must be distinct',
    }),
  gender: z
    .strictObject({ m: nonEmptyString, f: nonEmptyString, both: nonEmptyString })
    .refine((gender) => allDistinct(Object.values(gender)), {
      error: 'gender values must be distinct',
    }),
  tov: z.strictObject({
    unpointed: z.strictObject({ m: nonEmptyString, f: nonEmptyString }),
    pointed: z.strictObject({
      m: z.strictObject({ sg: nonEmptyString, pl: nonEmptyString }),
      f: z.strictObject({ sg: nonEmptyString, pl: nonEmptyString }),
    }),
  }),
  productionAnswer: z.strictObject({
    noun: placeholderTemplate(['word', 'tov']),
    verb: placeholderTemplate(['word', 'preposition']),
  }),
  forms: z.strictObject({
    separator: nonEmptyString,
    labels: z.strictObject({
      plural: nonEmptyString,
      feminine: nonEmptyString,
      mascPlural: nonEmptyString,
      femPlural: nonEmptyString,
    }),
  }),
  root: z.strictObject({ separator: nonEmptyString }),
  binyanim: z
    .array(z.strictObject({ value: nonEmptyString, aliases: z.array(nonEmptyString) }))
    .min(1)
    // An alias that names two binyanim would make conversion a guess.
    .refine(
      (binyanim) => allDistinct(binyanim.flatMap((binyan) => [binyan.value, ...binyan.aliases])),
      {
        error: 'binyan values and aliases must be distinct',
      },
    ),
  // The prepositions a verb governs, which its production answer carries so I learn the word
  // with it: `לחכות ל`, `לפחד מ`. את is left out on purpose. It is the default, and a verb
  // that takes a direct object gets no preposition at all: `לראות`, not `לראות את`.
  prepositions: z.array(nonEmptyString).min(1),
  links: z
    .array(
      z.strictObject({
        id: nonEmptyString,
        label: nonEmptyString,
        template: placeholderTemplate(['word', 'gloss']).refine(
          (value) => value.startsWith('https://'),
          {
            error: 'must be an https URL',
          },
        ),
        check: z.boolean(),
      }),
    )
    .refine((links) => allDistinct(links.map((link) => link.id)), {
      error: 'link ids must be distinct',
    }),
  linkCheck: z.strictObject({
    userAgent: nonEmptyString,
    minIntervalMs: z.int().nonnegative(),
    timeoutMs: z.int().positive(),
  }),
  definitions: z.strictObject({ prefillFromDictionary: z.boolean() }),
  dictionary: z.strictObject({ jsonl: repoRelativePath, index: repoRelativePath }),
});

export type Config = z.infer<typeof configSchema>;

export function parseConfig(value: unknown): Config {
  return configSchema.parse(value);
}

export const config = parseConfig(rawConfig);
