import type { Example } from '#lib/card/examples.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import { usesForm, usesRoot } from '#lib/hebrew/usage.ts';

// Any of them may be blank. A preposition's and other's are typed into `Forms` by hand, one
// `label: form` line each.
function inputForms(inputs: CardInputsDraft, formsField: string): string[] {
  switch (inputs.partOfSpeech) {
    case 'noun':
      return [inputs.noun.plural, inputs.noun.feminine, inputs.noun.femininePlural];
    case 'verb':
      return [inputs.verb.past, inputs.verb.present, inputs.verb.future];
    case 'adjective':
      return Object.values(inputs.adjective);
    case 'preposition':
    case 'other':
      return formsField.split('\n').map((line) => line.replace(/^[^:]*:/, ''));
    case 'adverb':
    case 'phrase':
    case undefined:
      return [];
  }
}

/**
 * The index of each example whose Hebrew is filled but uses no form of the word. The forms are
 * those the inputs and `Forms` hold, and a verb's root as well, since its forms are for “he” while
 * an example may conjugate it any way: `דיברתי` for `לְדַבֵּר`.
 */
export function examplesWithoutWord({
  examples,
  inputs,
  formsField,
}: {
  examples: readonly Example[];
  inputs: CardInputsDraft;
  formsField: string;
}): number[] {
  if (inputs.word.trim() === '') return [];
  const forms = [inputs.word, inputs.pointed, ...inputForms(inputs, formsField)];
  const root = inputs.partOfSpeech === 'verb' ? formatRoot(inputs.root) : undefined;
  return examples.flatMap(({ hebrew }, index) =>
    hebrew.trim() === '' ||
    usesForm(hebrew, forms) ||
    (root !== undefined && usesRoot(hebrew, root))
      ? []
      : [index],
  );
}
