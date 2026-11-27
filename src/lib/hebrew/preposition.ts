// The prepositions (מילות יחס) a verb commonly governs, roughly by frequency. Hebrew grammar counts
// את, which marks a definite direct object, among them, and so does the deck: “to see” takes את and
// “to help” takes ל, and telling those apart is worth drilling. אל, אחרי, בפני and מפני are left
// out: after a verb they are rare or formal, and the deck is a beginner's.
export const GOVERNED_PREPOSITIONS = ['את', 'ל', 'ב', 'על', 'עם', 'מ'] as const;

export type GovernedPreposition = (typeof GOVERNED_PREPOSITIONS)[number];

// How a card shows each one standing alone, which neither Claude nor the human points. A prefix
// takes its citation vowel and a maqaf, as a dictionary writes it, since there is no next word to
// point it by. NFC, as a test checks.
export const POINTED_PREPOSITIONS: Readonly<Record<GovernedPreposition, string>> = {
  את: 'אֶת',
  ל: 'לְ־',
  ב: 'בְּ־',
  על: 'עַל',
  עם: 'עִם',
  מ: 'מִ־',
};

// Wiktionary titles a preposition that joins the next word with a maqaf: `ל־`, `חוץ מ־`. The
// Production card's typed answer leaves it out: `חוץ מ`.
export function withoutTrailingMaqaf(word: string): string {
  return word.replace(/[־-]+$/, '');
}
