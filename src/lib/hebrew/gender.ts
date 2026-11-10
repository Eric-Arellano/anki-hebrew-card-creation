// As the deck's `Gender` field spells them, where `mf` is a noun of both genders.
export const GENDERS = ['m', 'f', 'mf'] as const;

export type Gender = (typeof GENDERS)[number];
