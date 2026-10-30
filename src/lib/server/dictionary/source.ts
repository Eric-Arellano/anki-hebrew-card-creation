// Reads one line of kaikki.org's extract of English Wiktionary (wiktextract's JSONL) into what the
// index keeps of it. `tests/fixtures/kaikki/hebrew.jsonl` holds real lines for every shape below.
//
// **Open:** kaikki.org marks this postprocessed file deprecated and "will be removed". The fallback
// is to filter the 24.8 GB all-language raw extract for `lang_code == "he"`, whose format differs,
// so this parser would need checking against it.
import { z } from 'zod';
import { hasNiqqud, isSamePointedText, toComparisonKey } from '#lib/hebrew/normalize.ts';
import { formatRoot } from '#lib/hebrew/root.ts';

const templateSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()).default({}),
});

const formSchema = z.object({
  form: z.string(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  links: z.array(z.array(z.string())).optional(),
});

const senseSchema = z.object({
  glosses: z.array(z.string()).default([]),
  raw_glosses: z.array(z.string()).optional(),
  form_of: z.array(z.object({ word: z.string() })).default([]),
  alt_of: z.array(z.object({ word: z.string() })).default([]),
  categories: z.array(z.object({ name: z.string() })).default([]),
});

const lineSchema = z.object({
  word: z.string(),
  pos: z.string(),
  lang_code: z.string(),
  etymology_number: z.union([z.string(), z.number()]).optional(),
  forms: z.array(formSchema).default([]),
  head_templates: z.array(templateSchema).default([]),
  etymology_templates: z.array(templateSchema).default([]),
  inflection_templates: z.array(templateSchema).default([]),
  senses: z.array(senseSchema).default([]),
});

type Form = z.infer<typeof formSchema>;
type Template = z.infer<typeof templateSchema>;

// The unpointed spelling is the source's own, never derived from the pointed one, and is missing
// where the source gives none.
export type Infinitive = { pointed: string; unpointed?: string };

// As the source spells them: codes and prepositions are converted only at lookup, so a change to
// a conversion needs no rebuild. Forms are pointed.
export type EntryFacts = {
  // The first line of each sense, skipping the generated ones of a form-of or alt-of sense.
  glosses: string[];
  // Joined with maqafs, without shin and sin dots. The index adds roots from categories.
  roots: string[];
  // `m` or `f`, with `-p` for a noun that is only plural and `-d` for one only dual.
  genders: string[];
  binyanCode?: string;
  plurals: string[];
  duals: string[];
  feminines: string[];
  femininePlurals: string[];
  // On a feminine noun, the masculine it is the counterpart of.
  masculines: string[];
  infinitives: Infinitive[];
  // From a gloss's `[with לְ־ ‘for’]`, like `לְ־`, `עַל` or `direct`.
  prepositions: string[];
  // As written, pointed or not.
  formOf: string[];
  altOf: string[];
};

export type SourceEntry = {
  word: string;
  pos: string;
  etymologyNumber: string | undefined;
  pointed: string | undefined;
  // Not a form of another entry, and with a meaning of its own.
  isLemma: boolean;
  facts: EntryFacts;
  categoryRoots: string[];
  // Every spelling that should find this entry: its title and each of its forms.
  keyForms: string[];
};

/** What the index keeps of a parsed line, or `undefined` for one it can't read or not Hebrew. */
export function readEntry(json: unknown): SourceEntry | undefined {
  const parsed = lineSchema.safeParse(json);
  if (!parsed.success || parsed.data.lang_code !== 'he') return undefined;
  const line = parsed.data;

  // The head template's forms; the inflection table's carry a `source`.
  const headForms = line.forms.filter((form) => form.source === undefined);
  const glossSenses = line.senses.filter(
    (sense) => sense.form_of.length === 0 && sense.alt_of.length === 0,
  );
  const glosses = glossSenses
    .map((sense) => (sense.raw_glosses ?? sense.glosses).at(-1) ?? '')
    .filter((gloss) => gloss !== '');

  return {
    word: line.word,
    pos: line.pos,
    etymologyNumber: line.etymology_number?.toString(),
    pointed: line.forms.find((form) => form.tags.includes('canonical'))?.form,
    isLemma: !isFormEntry(line.head_templates) && glosses.length > 0,
    facts: {
      glosses,
      roots: templateRoots(line.etymology_templates, line.inflection_templates),
      genders: line.head_templates
        .flatMap((template) => [stringArg(template, 'g') ?? '', stringArg(template, 'g2') ?? ''])
        .filter((gender) => gender !== ''),
      binyanCode: stringArg(templateNamed(line.head_templates, 'he-verb'), '1'),
      plurals: pointedFormsTagged(headForms, ['indefinite', 'plural']),
      duals: pointedFormsTagged(headForms, ['dual', 'indefinite']),
      feminines: pointedFormsTagged(headForms, ['feminine']),
      femininePlurals: pointedFormsTagged(headForms, ['feminine', 'plural']),
      masculines: pointedFormsTagged(headForms, ['masculine']),
      infinitives: infinitives(line.forms),
      prepositions: line.senses.flatMap((sense) =>
        (sense.raw_glosses ?? []).flatMap((gloss) =>
          [...gloss.matchAll(/\[with ([^\]\s‘(]+)/g)].map((match) => match[1] ?? ''),
        ),
      ),
      formOf: unique(line.senses.flatMap((sense) => sense.form_of.map((target) => target.word))),
      altOf: unique(line.senses.flatMap((sense) => sense.alt_of.map((target) => target.word))),
    },
    categoryRoots: unique(
      line.senses.flatMap((sense) =>
        sense.categories.flatMap((category) => {
          const root = /^Hebrew terms belonging to the root (.+)$/.exec(category.name)?.[1];
          return root === undefined ? [] : storedRoots([root]);
        }),
      ),
    ),
    keyForms: [line.word, ...line.forms.filter(isWordForm).map((form) => form.form)],
  };
}

function templateNamed(templates: readonly Template[], name: string): Template | undefined {
  return templates.find((template) => template.name === name);
}

function stringArg(template: Template | undefined, name: string): string | undefined {
  const value = template?.args[name];
  return typeof value === 'string' ? value : undefined;
}

// A form entry's page section is "Noun form", "Verb forms" and the like: `לדבר`'s only sense is
// "To-infinitive of דיבר", which has no `form_of`, so its head template is what marks it.
function isFormEntry(headTemplates: readonly Template[]): boolean {
  return headTemplates.some(
    (template) =>
      /(^|\s)forms?$/.test(template.name) ||
      (template.name === 'head' && /(^|\s)forms?$/.test(stringArg(template, '2') ?? '')),
  );
}

// `he-rootbox` in the etymology holds the root joined (`שׁ־נ־ה`), and sometimes a second one;
// `he-conj`'s second argument holds it unjoined (`שׁמשׁ`).
function templateRoots(
  etymologyTemplates: readonly Template[],
  inflectionTemplates: readonly Template[],
): string[] {
  const rootboxes = etymologyTemplates.filter((template) => template.name === 'he-rootbox');
  return storedRoots([
    ...rootboxes.flatMap((template) => [stringArg(template, '1'), stringArg(template, '2')]),
    stringArg(templateNamed(inflectionTemplates, 'he-conj'), '2'),
  ]);
}

// A root category may add a sense label: `ע־ב־ר (pregnancy)`.
function storedRoots(roots: readonly (string | undefined)[]): string[] {
  return unique(
    roots.flatMap((root) => {
      const formatted = formatRoot(toComparisonKey((root ?? '').replace(/\s*\(.*\)$/, '')));
      return formatted === undefined ? [] : [formatted];
    }),
  );
}

// A `wv` head template lists each form only pointed; a `dwv` one lists the ktiv male spelling and
// then the pointed one. Only the pointed ones are kept.
function pointedFormsTagged(forms: readonly Form[], tags: readonly string[]): string[] {
  return unique(
    forms
      .filter(
        (form) =>
          form.tags.length === tags.length &&
          tags.every((tag) => form.tags.includes(tag)) &&
          hasNiqqud(form.form),
      )
      .map((form) => form.form),
  );
}

// The head template names the infinitive for only a few verbs. The rest have it in the
// conjugation table, which wiktextract fails to tag: there it is the one row tagged
// `error-unrecognized-form` that starts with ל, or `-` for a verb with none, like a pu'al.
//
// Either way, a form is followed by its pointed spelling when the two differ (`לספור`,
// `לִסְפֹּר`), and otherwise is only pointed and links to its page (`לדבר#Hebrew`).
function infinitives(forms: readonly Form[]): Infinitive[] {
  const fromHead = pairInfinitives(
    forms.filter((form) => form.source === undefined && form.tags.includes('infinitive')),
  );
  const fromTable = pairInfinitives(
    forms.filter(
      (form) =>
        form.source === 'conjugation' &&
        form.tags.includes('error-unrecognized-form') &&
        form.form.startsWith('ל'),
    ),
  );
  if (fromHead.length === 0) return fromTable;
  // The head template's `inf` gives no unpointed spelling when the pointed one has no other.
  return fromHead.map((infinitive) =>
    infinitive.unpointed === undefined
      ? (fromTable.find((other) => isSamePointedText(other.pointed, infinitive.pointed)) ??
        infinitive)
      : infinitive,
  );
}

function pairInfinitives(forms: readonly Form[]): Infinitive[] {
  const pairs: Infinitive[] = [];
  let unpointed: string | undefined;
  for (const form of forms) {
    if (!hasNiqqud(form.form)) {
      unpointed = form.form;
      continue;
    }
    const linkTarget = form.links?.[0]?.[1]?.replace(/#.*$/, '');
    const pair = { pointed: form.form, unpointed: linkTarget ?? unpointed };
    if (
      !pairs.some(
        (other) =>
          isSamePointedText(other.pointed, pair.pointed) && other.unpointed === pair.unpointed,
      )
    ) {
      pairs.push(pair);
    }
    unpointed = undefined;
  }
  return pairs;
}

// Not a romanization, a pattern like `קֶטֶל`, the table's bookkeeping, or `-` for a missing cell.
const NOT_WORD_TAGS = ['romanization', 'class', 'table-tags', 'inflection-template'];

function isWordForm(form: Form): boolean {
  return /[א-ת]/.test(form.form) && !form.tags.some((tag) => NOT_WORD_TAGS.includes(tag));
}

function unique(values: readonly string[]): string[] {
  return values.filter(
    (value, index) => values.findIndex((other) => isSamePointedText(other, value)) === index,
  );
}
