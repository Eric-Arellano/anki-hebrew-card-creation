// As the deck's `Binyan` field spells them.
export const BINYANIM = [
  "pa'al",
  "nif'al",
  "pi'el",
  "pu'al",
  "hif'il",
  "huf'al",
  "hitpa'el",
] as const;

export type Binyan = (typeof BINYANIM)[number];
