import { type Example, labeledForms } from '#lib/card/examples.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import { usesForm, usesRoot } from '#lib/hebrew/usage.ts';

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
  const forms = [
    inputs.word,
    inputs.pointed,
    ...labeledForms(inputs, formsField).map(({ form }) => form),
  ];
  const root = inputs.partOfSpeech === 'verb' ? formatRoot(inputs.root) : undefined;
  return examples.flatMap(({ hebrew }, index) =>
    hebrew.trim() === '' ||
    usesForm(hebrew, forms) ||
    (root !== undefined && usesRoot(hebrew, root))
      ? []
      : [index],
  );
}
