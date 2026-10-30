import type { Gender } from '#lib/hebrew/gender.ts';

// The deck's convention gives an `mf` noun the masculine. A noun that is only plural agrees in the
// plural: “מים טובים”.
export function productionTov({
  gender,
  pluralOnly,
}: {
  gender: Gender;
  pluralOnly: boolean;
}): 'טוב' | 'טובה' | 'טובים' | 'טובות' {
  if (pluralOnly) return gender === 'f' ? 'טובות' : 'טובים';
  return gender === 'f' ? 'טובה' : 'טוב';
}

/**
 * A variant answer for the pointed `plural`, which agrees with the noun's grammatical gender, not
 * with the plural's suffix: “אָבוֹת טוֹבִים”, “שָׁנִים טוֹבוֹת”. An `mf` noun can take either.
 */
export function pluralVariantAnswers(plural: string, gender: Gender): string[] {
  const tovs = { m: ['טוֹבִים'], f: ['טוֹבוֹת'], mf: ['טוֹבִים', 'טוֹבוֹת'] }[gender];
  return tovs.map((tov) => `${plural.trim()} ${tov}`);
}
