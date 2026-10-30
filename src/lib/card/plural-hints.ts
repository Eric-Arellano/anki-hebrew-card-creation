import type { NounDraft } from '#lib/card/noun.ts';
import type { Gender } from '#lib/hebrew/gender.ts';
import { type IrregularPlural, irregularPlural } from '#lib/hebrew/plural.ts';
import { pluralVariantAnswers } from '#lib/hebrew/tov.ts';

export type PluralHint = {
  plural: string;
  reason: IrregularPlural;
  // What a variant card for it could ask for, pointed: `שֻׁלְחָנוֹת טוֹבִים`.
  answers: string[];
};

/** The plurals in `noun` irregular enough to suggest a variant card for, the human to decide. */
export function pluralHints(noun: NounDraft, pointed: string): PluralHint[] {
  if (noun.gender === undefined || noun.pluralOnly) return [];
  const pairs: { singular: string; plural: string; gender: Gender }[] = [
    { singular: pointed, plural: noun.plural, gender: noun.gender },
    // A feminine counterpart is a noun in its own right: `אֵם` → `אִמָּהוֹת`.
    ...(noun.gender === 'm'
      ? [{ singular: noun.feminine, plural: noun.femininePlural, gender: 'f' as const }]
      : []),
  ];
  return pairs.flatMap((pair) => {
    const reason = irregularPlural(pair);
    if (reason === undefined) return [];
    return [
      {
        plural: pair.plural.trim(),
        reason,
        answers: pluralVariantAnswers(pair.plural, pair.gender),
      },
    ];
  });
}
