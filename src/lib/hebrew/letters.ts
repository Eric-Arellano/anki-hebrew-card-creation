// Which scripts text is written in, for telling a Hebrew answer from an English one.

const HEBREW_LETTER = /[א-ת]/;
const LATIN_LETTER = /[a-z]/i;

export function hasHebrewLetters(text: string): boolean {
  return HEBREW_LETTER.test(text);
}

export function hasLatinLetters(text: string): boolean {
  return LATIN_LETTER.test(text);
}
