import { textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputs, Definitions, NounInputs } from '#lib/card-inputs.ts';
import { productionTov } from '#lib/hebrew/tov.ts';
import type { FieldValues } from '#lib/note-type.ts';

/** What the editor suggests for each field it can fill from `inputs`, as Anki field HTML. */
export function suggestFields(inputs: CardInputs): FieldValues {
  const word = textToAnkiFieldHtml(inputs.word.trim());
  const shared = {
    // What the human typed, never derived from the pointed form: `דִּבֵּר` strips to `דבר`, not `דיבר`.
    unpointed: word,
    pointed: textToAnkiFieldHtml(inputs.pointed.trim()),
    definitions: definitionsHtml(inputs.definitions),
  };
  switch (inputs.partOfSpeech) {
    case 'noun':
      return { ...shared, ...suggestNounFields(word, inputs.noun) };
    // A verb's will carry its preposition once verbs have their own composition.
    case 'verb':
    case 'other':
      return { ...shared, productionAnswer: word };
  }
}

// One meaning alone, or `1. friend<br>2. companion` when there are several.
function definitionsHtml(definitions: Definitions): string {
  if (definitions.length === 1) return textToAnkiFieldHtml(definitions[0]);
  return definitions
    .map((definition, index) => `${index + 1}. ${textToAnkiFieldHtml(definition)}`)
    .join('<br>');
}

function suggestNounFields(word: string, noun: NounInputs): FieldValues {
  return {
    productionAnswer: `${word} ${productionTov(noun.gender)}`,
    gender: noun.gender,
    forms: nounFormsHtml(noun),
  };
}

// `pl: דָּגִים` alone, or `f: כַּלְבָּה<br>m.pl: כְּלָבִים<br>f.pl: כְּלָבוֹת` once a masculine noun has a
// feminine counterpart. A blank form is left out rather than labelled with nothing.
function nounFormsHtml(noun: NounInputs): string {
  return nounFormLines(noun)
    .map(([label, form]): [string, string] => [label, form.trim()])
    .filter(([, form]) => form !== '')
    .map(([label, form]) => `${label}: ${textToAnkiFieldHtml(form)}`)
    .join('<br>');
}

function nounFormLines(noun: NounInputs): [label: string, form: string][] {
  if (noun.gender !== 'm' || (noun.feminine.trim() === '' && noun.femininePlural.trim() === '')) {
    return [['pl', noun.plural]];
  }
  return [
    ['f', noun.feminine],
    ['m.pl', noun.plural],
    ['f.pl', noun.femininePlural],
  ];
}
