// What Claude writes goes into an input that is saved as Anki HTML, where `<`, `>` and `&` would be
// markup, and a line break would split one suggestion into two.
import { hasHebrewLetters, hasLatinLetters } from '#lib/hebrew/letters.ts';
import { hasNiqqud } from '#lib/hebrew/normalize.ts';

export function isPlainLine(text: string): boolean {
  return text.trim() !== '' && !/[<>&\r\n]/.test(text);
}

// Unpointed, because pointing from a model isn't a source the Hebrew text rules can trust.
export function isUnpointedHebrew(text: string): boolean {
  return isPlainLine(text) && hasHebrewLetters(text) && !hasLatinLetters(text) && !hasNiqqud(text);
}
