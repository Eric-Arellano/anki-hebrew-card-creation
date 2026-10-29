// Only the 22 letters and their final forms: a root never carries niqqud.
const ROOT_LETTER = /^[א-ת]$/;

// What people type between a root's letters, the maqaf included: ד.ב.ר, ד-ב-ר, ד ב ר, ד־ב־ר.
const SEPARATORS = /[.\-־\s]/g;

/** `text`'s letters joined by maqafs, as the deck's `Root` field holds them: `ד־ב־ר`. */
export function formatRoot(text: string): string | undefined {
  const letters = [...text.normalize('NFC').replace(SEPARATORS, '')];
  if (letters.length === 0 || !letters.every((letter) => ROOT_LETTER.test(letter))) {
    return undefined;
  }
  return letters.join('־');
}
