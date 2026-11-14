// Reads one line of kaikki.org's extract of English Wiktionary (wiktextract's JSONL) into what the
// index keeps of it. `tests/fixtures/kaikki/hebrew.jsonl` holds real lines for every shape below.
//
// **Open:** kaikki.org marks this postprocessed file deprecated and "will be removed". The fallback
// is to filter the 24.8 GB all-language raw extract for `lang_code == "he"`, whose format differs,
// so this parser would need checking against it.
import { z } from 'zod';
import type { DictionaryInfinitive } from '#lib/api/dictionary.ts';
import {
  hasNiqqud,
  toComparisonKey,
  uniquePointedText,
  withoutDirectionControls,
} from '#lib/hebrew/normalize.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import {
  infinitives,
  isWordForm,
  pointedFormsTagged,
} from '#lib/server/dictionary/source-forms.ts';

// A word or form, without the direction controls that wrap some of them.
const hebrewText = z.string().transform((text) => withoutDirectionControls(text).trim());

const templateSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()).default({}),
});

const formSchema = z.object({
  form: hebrewText,
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  links: z.array(z.array(hebrewText)).optional(),
});

const senseSchema = z.object({
  glosses: z.array(z.string()).default([]),
  raw_glosses: z.array(z.string()).optional(),
  form_of: z.array(z.object({ word: hebrewText })).default([]),
  alt_of: z.array(z.object({ word: hebrewText })).default([]),
  categories: z.array(z.object({ name: z.string() })).default([]),
});

const lineSchema = z.object({
  word: hebrewText,
  pos: z.string(),
  lang_code: z.string(),
  etymology_number: z.union([z.string(), z.number()]).optional(),
  forms: z.array(formSchema).default([]),
  head_templates: z.array(templateSchema).default([]),
  etymology_templates: z.array(templateSchema).default([]),
  inflection_templates: z.array(templateSchema).default([]),
  senses: z.array(senseSchema).default([]),
});

export type Form = z.infer<typeof formSchema>;
type Template = z.infer<typeof templateSchema>;

// As the source spells them: codes and prepositions are converted only at lookup, so a change to
// a conversion needs no rebuild. Forms are pointed.
export type EntryFacts = {
  // The first line of each sense, skipping the generated ones of a form-of or alt-of sense.
  glosses: string[];
  // Joined with maqafs, without shin and sin dots. Those of the entry's `he-rootbox`, to which the
  // index adds others for an entry without one.
  roots: string[];
  // `m` or `f`, with `-p` for a noun that is only plural and `-d` for one only dual.
  genders: string[];
  binyanCode?: string;
  plurals: string[];
  duals: string[];
  feminines: string[];
  // An adjective's. A noun's are `plurals`, however it spells them.
  masculinePlurals: string[];
  femininePlurals: string[];
  // On a feminine noun, the masculine it is the counterpart of.
  masculines: string[];
  infinitives: DictionaryInfinitive[];
  // A verb's, for “he”. Its past is the entry's `pointed`.
  presents: string[];
  futures: string[];
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
  conjugationRoots: string[];
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
  // A cell holding two spellings, `ייגש \ יִגַּשׁ`, is no word form, so its input stays blank.
  const conjugationForms = line.forms.filter(
    (form) => form.source === 'conjugation' && isWordForm(form),
  );
  const glossSenses = line.senses.filter(
    (sense) => sense.form_of.length === 0 && sense.alt_of.length === 0,
  );
  const glosses = glossSenses
    .map((sense) => (sense.raw_glosses ?? sense.glosses).at(-1) ?? '')
    .filter((gloss) => gloss !== '');
  // Missing niqqud for a few words, like `שמיים`, which then has no pointed spelling.
  const canonical = line.forms.find((form) => form.tags.includes('canonical'))?.form;

  return {
    word: line.word,
    pos: line.pos,
    etymologyNumber: line.etymology_number?.toString(),
    pointed: canonical !== undefined && hasNiqqud(canonical) ? canonical : undefined,
    isLemma: !isFormEntry(line.head_templates) && glosses.length > 0,
    facts: {
      glosses,
      roots: rootboxRoots(line.etymology_templates),
      genders: line.head_templates
        .flatMap((template) => [stringArg(template, 'g') ?? '', stringArg(template, 'g2') ?? ''])
        .filter((gender) => gender !== ''),
      binyanCode: stringArg(templateNamed(line.head_templates, 'he-verb'), '1'),
      plurals: pointedFormsTagged(headForms, ['indefinite', 'plural']),
      duals: pointedFormsTagged(headForms, ['dual', 'indefinite']),
      feminines: pointedFormsTagged(headForms, ['feminine']),
      masculinePlurals: pointedFormsTagged(headForms, ['masculine', 'plural']),
      femininePlurals: pointedFormsTagged(headForms, ['feminine', 'plural']),
      masculines: pointedFormsTagged(headForms, ['masculine']),
      infinitives: infinitives(line.forms),
      presents: pointedFormsTagged(conjugationForms, ['masculine', 'present', 'singular']),
      futures: pointedFormsTagged(conjugationForms, [
        'future',
        'masculine',
        'singular',
        'third-person',
      ]),
      prepositions: line.senses.flatMap((sense) =>
        (sense.raw_glosses ?? []).flatMap((gloss) =>
          [...gloss.matchAll(/\[with ([^\]\s‘(]+)/g)].map((match) => match[1] ?? ''),
        ),
      ),
      formOf: uniquePointedText(
        line.senses.flatMap((sense) => sense.form_of.map((target) => target.word)),
      ),
      altOf: uniquePointedText(
        line.senses.flatMap((sense) => sense.alt_of.map((target) => target.word)),
      ),
    },
    categoryRoots: uniquePointedText(
      line.senses.flatMap((sense) =>
        sense.categories.flatMap((category) => {
          const root = /^Hebrew terms belonging to the root (.+)$/.exec(category.name)?.[1];
          return root === undefined ? [] : storedRoots([root]);
        }),
      ),
    ),
    conjugationRoots: conjugationRoots(line.inflection_templates),
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

// `he-rootbox` in the etymology holds the root joined (`שׁ־נ־ה`), and a blend's second one.
function rootboxRoots(etymologyTemplates: readonly Template[]): string[] {
  const rootboxes = etymologyTemplates.filter((template) => template.name === 'he-rootbox');
  return storedRoots(
    rootboxes.flatMap((template) => [stringArg(template, '1'), stringArg(template, '2')]),
  );
}

// `he-conj`'s second argument is the stem it conjugates, which is usually the root (`שׁמשׁ`) but
// not always: `וצא` for י־צ־א and `בני` for ב־נ־ה. A third argument means the stem is split across
// them for an irregular conjugation, and the second alone is then only its start, like `ק` for
// `קיווה`, so it says nothing.
function conjugationRoots(inflectionTemplates: readonly Template[]): string[] {
  const conjugation = templateNamed(inflectionTemplates, 'he-conj');
  return stringArg(conjugation, '3') === undefined
    ? storedRoots([stringArg(conjugation, '2')])
    : [];
}

// A root category may add a sense label: `ע־ב־ר (pregnancy)`.
function storedRoots(roots: readonly (string | undefined)[]): string[] {
  return uniquePointedText(
    roots.flatMap((root) => {
      const formatted = formatRoot(toComparisonKey((root ?? '').replace(/\s*\(.*\)$/, '')));
      return formatted === undefined ? [] : [formatted];
    }),
  );
}
