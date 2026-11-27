// What Claude writes goes into an input that is saved as Anki HTML, where `<`, `>` and `&` would be
// markup, and a line break would split one suggestion into two.
import { hasHebrewLetters, hasLatinLetters } from '#lib/hebrew/letters.ts';
import { hasNiqqud } from '#lib/hebrew/normalize.ts';

/** Not blank, on one line, and with nothing Anki would read as markup. */
export function isPlainLine(text: string): boolean {
  return text.trim() !== '' && !/[<>&\r\n]/.test(text);
}

/** Plain Hebrew without niqqud, since a model's pointing isn't a source the text rules trust. */
export function isUnpointedHebrew(text: string): boolean {
  return isPlainLine(text) && hasHebrewLetters(text) && !hasLatinLetters(text) && !hasNiqqud(text);
}
