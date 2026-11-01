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

// Other spellings of each binyan, lowercase, and Wiktionary's codes for them (`pa`, `nif`, …).
// Keyed by alias, so no alias can name two binyanim. Wiktionary's `hitpu'al` and `nitpa'el` are
// left out: the deck has no such binyan.
const BINYAN_BY_ALIAS: Readonly<Record<string, Binyan>> = {
  paal: "pa'al",
  qal: "pa'al",
  kal: "pa'al",
  pa: "pa'al",
  nifal: "nif'al",
  nif: "nif'al",
  piel: "pi'el",
  pi: "pi'el",
  pual: "pu'al",
  pu: "pu'al",
  hifil: "hif'il",
  hif: "hif'il",
  "hof'al": "huf'al",
  hufal: "huf'al",
  hofal: "huf'al",
  huf: "huf'al",
  hitpael: "hitpa'el",
  hit: "hitpa'el",
};

/** The binyan `text` names, by its own name or an alias, or `undefined` if it names none. */
export function toBinyan(text: string): Binyan | undefined {
  const name = text.trim().toLowerCase().replaceAll('’', "'");
  const binyan = BINYANIM.find((candidate) => candidate === name);
  return binyan ?? (Object.hasOwn(BINYAN_BY_ALIAS, name) ? BINYAN_BY_ALIAS[name] : undefined);
}
