import type { NounInputs } from '#lib/card-inputs.ts';

// The deck's convention gives an `mf` noun the masculine. A noun that is only plural agrees in the
// plural: “מים טובים”.
export function productionTov({
  gender,
  pluralOnly,
}: Pick<NounInputs, 'gender' | 'pluralOnly'>): 'טוב' | 'טובה' | 'טובים' | 'טובות' {
  if (pluralOnly) return gender === 'f' ? 'טובות' : 'טובים';
  return gender === 'f' ? 'טובה' : 'טוב';
}
