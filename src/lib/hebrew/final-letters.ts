// The five letters with a form of their own at the end of a word: `מלך`, but `מלכה`.
export const FINAL_BY_MEDIAL: Readonly<Record<string, string>> = {
  כ: 'ך',
  מ: 'ם',
  נ: 'ן',
  פ: 'ף',
  צ: 'ץ',
};

export const MEDIAL_BY_FINAL: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FINAL_BY_MEDIAL).map(([medial, final]) => [final, medial]),
);

export function withMedialLetters(text: string): string {
  return text.replace(/[ךםןףץ]/g, (final) => MEDIAL_BY_FINAL[final] ?? final);
}
