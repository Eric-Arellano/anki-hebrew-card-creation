import type { DictionaryInfinitive } from '#lib/api/dictionary.ts';
import { hasNiqqud, isSamePointedText, uniquePointedText } from '#lib/hebrew/normalize.ts';
import type { Form } from './source.ts';

// A `wv` head template lists each form only pointed; a `dwv` one lists the ktiv male spelling and
// then the pointed one. Only the pointed ones are kept.
export function pointedFormsTagged(forms: readonly Form[], tags: readonly string[]): string[] {
  return uniquePointedText(
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
// `error-unrecognized-form` that starts with ל, or `-` for a verb with none, like a pu'al. Either
// way only a form with ל counts: the head template of `גווע` also names the biblical `גְּוֺעַ`.
//
// A form is followed by its pointed spelling when the two differ (`לספור`, `לִסְפֹּר`), and
// otherwise is only pointed and links to its page (`לדבר#Hebrew`).
export function infinitives(forms: readonly Form[]): DictionaryInfinitive[] {
  const withLamed = forms.filter((form) => form.form.startsWith('ל'));
  const fromHead = pairInfinitives(
    withLamed.filter((form) => form.source === undefined && form.tags.includes('infinitive')),
  );
  const fromTable = pairInfinitives(
    withLamed.filter(
      (form) => form.source === 'conjugation' && form.tags.includes('error-unrecognized-form'),
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

// One pointed spelling paired with two unpointed ones keeps neither, for the human to type: the
// table gives `לִנְשֹׁר` after `לנשור` and again linking to `לנשר`.
function pairInfinitives(forms: readonly Form[]): DictionaryInfinitive[] {
  const pairs: DictionaryInfinitive[] = [];
  let unpointed: string | undefined;
  for (const form of forms) {
    if (!hasNiqqud(form.form)) {
      unpointed = form.form;
      continue;
    }
    const linkTarget = form.links?.[0]?.[1]?.replace(/#.*$/, '');
    pairs.push({ pointed: form.form, unpointed: linkTarget ?? unpointed });
    unpointed = undefined;
  }
  return pairs.flatMap((pair) => {
    const samePointed = pairs.filter((other) => isSamePointedText(other.pointed, pair.pointed));
    if (samePointed[0] !== pair) return [];
    const spellings = uniquePointedText(samePointed.flatMap((other) => other.unpointed ?? []));
    return [
      { pointed: pair.pointed, unpointed: spellings.length === 1 ? spellings[0] : undefined },
    ];
  });
}

// Not a romanization, a pattern like `קֶטֶל`, the table's bookkeeping, or `-` for a missing cell.
const NOT_WORD_TAGS = ['romanization', 'class', 'table-tags', 'inflection-template'];

// Hebrew letters, points and punctuation, and nothing else: not the table's notes, like
// `form אחי` or `אַל + Second person future tense`.
const WORD = /^[\u0590-\u05FF\s]*[א-ת][\u0590-\u05FF\s]*$/;

export function isWordForm(form: Form): boolean {
  return WORD.test(form.form) && !form.tags.some((tag) => NOT_WORD_TAGS.includes(tag));
}
