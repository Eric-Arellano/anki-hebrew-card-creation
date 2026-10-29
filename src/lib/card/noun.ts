import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { Gender } from '#lib/hebrew/gender.ts';
import { productionTov } from '#lib/hebrew/tov.ts';
import type { FieldValues } from '#lib/note-type.ts';

// The forms are pointed, as the human copies them from a dictionary, and any may be blank. A noun
// that is only ever plural, like מים, has no other forms. Of the rest, only a masculine noun
// can have a feminine counterpart (כלב → כלבה), and most have none.
export type NounInputs =
  | { pluralOnly: true; gender: Gender }
  | { pluralOnly: false; gender: 'm'; plural: string; feminine: string; femininePlural: string }
  | { pluralOnly: false; gender: 'f' | 'mf'; plural: string };

// The gender starts unchosen, so the editor never guesses it. Every form is kept whatever the
// gender, so switching back loses nothing.
export type NounDraft = {
  gender: Gender | undefined;
  pluralOnly: boolean;
  plural: string;
  feminine: string;
  femininePlural: string;
};

export function emptyNounDraft(): NounDraft {
  return { gender: undefined, pluralOnly: false, plural: '', feminine: '', femininePlural: '' };
}

export function missingNounInputs({ gender }: NounDraft): 'gender'[] {
  return gender === undefined ? ['gender'] : [];
}

// Drops the forms that the gender, or being only plural, rules out.
export function completeNoun({
  gender,
  pluralOnly,
  plural,
  ...counterpart
}: NounDraft): NounInputs | undefined {
  if (gender === undefined) return undefined;
  if (pluralOnly) return { pluralOnly, gender };
  return gender === 'm'
    ? { pluralOnly, gender, plural, ...counterpart }
    : { pluralOnly, gender, plural };
}

/** The fields a noun's inputs write, given `word` as Anki field HTML. */
export function composeNounFields(word: string, noun: NounInputs): FieldValues {
  return {
    productionAnswer: `${word} ${productionTov(noun)}`,
    gender: noun.gender,
    forms: formsHtml(noun),
  };
}

// `pl: דָּגִים` alone, or `f: כַּלְבָּה<br>m.pl: כְּלָבִים<br>f.pl: כְּלָבוֹת` once a masculine noun has a
// feminine counterpart. A blank form is left out rather than labelled with nothing.
function formsHtml(noun: NounInputs): string {
  return formLines(noun)
    .map(([label, form]): [string, string] => [label, form.trim()])
    .filter(([, form]) => form !== '')
    .map(([label, form]) => `${label}: ${textToAnkiFieldHtml(form)}`)
    .join('<br>');
}

function formLines(noun: NounInputs): [label: string, form: string][] {
  if (noun.pluralOnly) return [];
  if (noun.gender !== 'm' || (noun.feminine.trim() === '' && noun.femininePlural.trim() === '')) {
    return [['pl', noun.plural]];
  }
  return [
    ['f', noun.feminine],
    ['m.pl', noun.plural],
    ['f.pl', noun.femininePlural],
  ];
}
