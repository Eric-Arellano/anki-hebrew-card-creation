import type { Gender } from '#lib/card-inputs.ts';

// The deck's convention gives an `mf` noun the masculine.
export function productionTov(gender: Gender): 'טוב' | 'טובה' {
  return gender === 'f' ? 'טובה' : 'טוב';
}
