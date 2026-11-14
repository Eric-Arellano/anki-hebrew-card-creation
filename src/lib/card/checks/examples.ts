import type { Example } from '#lib/card/examples.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { wordUsage } from '#lib/card/parts-of-speech/forms.ts';
import { usageRanges } from '#lib/hebrew/usage.ts';

/** The index of each example whose Hebrew is filled but uses no form of the word. */
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
  const word = wordUsage(inputs, formsField);
  return examples.flatMap(({ hebrew }, index) =>
    hebrew.trim() === '' || usageRanges(hebrew, word).length > 0 ? [] : [index],
  );
}
