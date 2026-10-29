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
