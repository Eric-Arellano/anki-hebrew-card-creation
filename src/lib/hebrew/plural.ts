import type { Gender } from '#lib/hebrew/gender.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';

/** Why a plural is worth its own variant card. */
export type IrregularPlural = 'masculine-with-ot' | 'feminine-with-im' | 'changed-stem';

const MEDIAL_BY_FINAL: Readonly<Record<string, string>> = {
  ך: 'כ',
  ם: 'מ',
  ן: 'נ',
  ף: 'פ',
  ץ: 'צ',
};

/**
 * Whether the pointed `plural` of the pointed `singular` breaks the usual pattern. Only the first
 * word counts, as it is the one that inflects: `בֵּית סֵפֶר` → `בָּתֵּי סֵפֶר`.
 */
export function irregularPlural({
  singular,
  plural,
  gender,
}: {
  singular: string;
  plural: string;
  gender: Gender;
}): IrregularPlural | undefined {
  const singularWord = firstWord(singular);
  const pluralWord = firstWord(plural);
  if (singularWord === '' || pluralWord === '') return undefined;
  // Duals end in ־ַיִם too, so `עַיִן` → `עֵינַיִם` counts.
  if (gender === 'm' && pluralWord.endsWith('ות')) return 'masculine-with-ot';
  if (gender === 'f' && pluralWord.endsWith('ים')) return 'feminine-with-im';
  return pluralWord.startsWith(stem(singularWord, gender)) ? undefined : 'changed-stem';
}

// Unpointed, but with every ו and י kept: a dropped vowel letter is exactly what changes in
// `בַּיִת` → `בָּתִּים` and `יוֹם` → `יָמִים`. *Rejected: comparing defective keys, because they hide
// both of those, and flag every `יְהוּדִי` → `יְהוּדִים`, whose final י is inside the plural.* What
// this still flags wrongly is a holam or shuruk written out in only one of the two, as in
// `כְּתֹבֶת` → `כְּתוֹבוֹת`: under 1% of Wiktionary's nouns.
function firstWord(text: string): string {
  return (
    toComparisonKey(text)
      .split(/[\s־]+/)
      .find((word) => word !== '') ?? ''
  );
}

// A feminine ending in ־וּת regularly takes ־ֻיּוֹת: `חֲנוּת` → `חֲנֻיּוֹת`.
function stem(singular: string, gender: Gender): string {
  return singular
    .replace(gender === 'm' ? /ה$/ : /ות$|[הת]$/, '')
    .replace(/[ךםןףץ](?=׳?$)/, (final) => MEDIAL_BY_FINAL[final] ?? final);
}
