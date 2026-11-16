import { MEDIAL_BY_FINAL } from '#lib/hebrew/final-letters.ts';
import type { Gender } from '#lib/hebrew/gender.ts';
import { toComparisonKey } from '#lib/hebrew/normalize.ts';

/** Why a plural is worth its own variant card. */
export type IrregularPlural = 'masculine-with-ot' | 'feminine-with-im' | 'changed-stem';

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
  return stems(singularWord, gender).some((stem) => addsOnlyAnEnding(pluralWord, stem))
    ? undefined
    : 'changed-stem';
}

// Unpointed, but with every ו and י kept: a dropped vowel letter is exactly what changes in
// `בַּיִת` → `בָּתִּים` and `יוֹם` → `יָמִים`. *Rejected: comparing defective keys, because they hide
// both of those, and flag every `יְהוּדִי` → `יְהוּדִים`, whose final י is inside the plural.*
//
// A shuruk counts as the qubuts it shortens to, though, as in `עוּגָה` → `עֻגוֹת`. In NFC every
// vowel point sorts before the dagesh, so a ו followed straight by one has no vowel of its own: it
// is a shuruk, never a doubled consonant like the וּ of `צִוָּה`.
function firstWord(text: string): string {
  return (
    toComparisonKey(text.normalize('NFC').replace(/ו\u05BC/g, '\u05BB'))
      .split(/[\s־]+/)
      .find((word) => word !== '') ?? ''
  );
}

// The singular whole, and without the ending its plural may replace: `דֶּלֶת` → `דְּלָתוֹת` keeps its
// ת, while `מְכוֹנִית` → `מְכוֹנִיּוֹת` drops it. An Aramaic loan ends in א where a Hebrew noun ends in
// ה: `סָבְתָא` → `סָבְתוֹת`.
function stems(singular: string, gender: Gender): string[] {
  return [singular, singular.replace(gender === 'm' ? /[הא]$/ : /[התא]$/, '')]
    .filter((stem) => stem !== '')
    .map((stem) => stem.replace(/[ךםןףץ](?=׳?$)/, (final) => MEDIAL_BY_FINAL[final] ?? final));
}

// The plural may write out a holam or hiriq the singular leaves unwritten, as in `כְּתֹבֶת` →
// `כְּתוֹבוֹת` and `אָחוֹת` → `אֲחָיוֹת`, so a ו or י may come between the stem's letters. Only the
// plural gains them: a singular's vowel letter missing from its plural is the irregular `יוֹם` →
// `יָמִים`. So it still flags the few regular plurals that drop a vowel letter the singular writes
// out, like `עוֹרֵב` → `עֹרְבִים` and `אֵיבוּס` → `אֵבוּסִים`.
//
// After the stem comes only the ending: ־ים or ־ות, the ־י of a construct like `כַּרְטִיסֵי אַשְׁרַאי`, or
// nothing the spelling shows, as in `כְּלִי טַיִס` → `כְּלֵי טַיִס`. Any other letter there is the stem
// changing: the נ of `בַּת` → `בָּנוֹת`, the ה of `אֵם` → `אִמָּהוֹת`, the second ל of `צֵל` → `צְלָלִים`
// and the א of `דֻּגְמָה` → `דֻּגְמָאוֹת`.
function addsOnlyAnEnding(pluralWord: string, stem: string): boolean {
  const letters = [...stem].map((letter) => letter.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'));
  return new RegExp(`^${letters.join('[וי]*')}[וי]*[םת]?$`).test(pluralWord);
}
