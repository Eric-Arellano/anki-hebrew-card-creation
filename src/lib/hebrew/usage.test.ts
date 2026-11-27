import { describe, expect, test } from 'vitest';
import { usageRanges, type WordUsage } from './usage.ts';

function used(text: string, word: WordUsage): string[] {
  return usageRanges(text, word).map(({ start, end }) => text.slice(start, end));
}

describe('usageRanges', () => {
  describe('for a form', () => {
    test.each([
      ['the form alone', 'כרטיס רכבת (train ticket)', ['רכבת'], ['רכבת']],
      ['a pointed form', 'כרטיס רכבת (train ticket)', ['רַכֶּבֶת'], ['רכבת']],
      ['a pointed text, points and all', 'כַּרְטִיס רַכֶּבֶת.', ['רכבת'], ['רַכֶּבֶת']],
      ['ktiv male for a form in ktiv haser', 'השולחן גדול', ['שֻׁלְחָן'], ['השולחן']],
      ['a prefix letter, as part of the word', 'הרכבת מאחרת', ['רכבת'], ['הרכבת']],
      ['stacked prefix letters', 'וכשהרכבת הגיעה', ['רכבת'], ['וכשהרכבת']],
      ['a form that starts with a prefix letter', 'אני בבית', ['בית'], ['בבית']],
      ['a form of several words, whole', 'יש בית ספר חדש', ['בֵּית סֵפֶר'], ['בית ספר']],
      ['prefixes on each word of a form', 'אני הולך לבית הספר', ['בֵּית סֵפֶר'], ['לבית הספר']],
      ['a form joined by a maqaf', 'אני הולך לבית ספר', ['בֵּית־סֵפֶר'], ['לבית ספר']],
      ['a one-letter preposition among the prefixes', 'הספר בבית', ['ב'], ['בבית']],
      ['a geresh typed with an apostrophe', "ראיתי ג'ירפה", ['ג׳ירפה'], ["ג'ירפה"]],
      ['a gershayim typed with a quote', 'הוא בצה"ל', ['צה״ל'], ['בצה"ל']],
      ['a form in quotes, without them', 'הוא אמר "רכבת".', ['רכבת'], ['רכבת']],
      ['every use', 'רכבת אחרי רכבת', ['רכבת'], ['רכבת', 'רכבת']],
      ['each of several forms', 'רכבת אחת, שתי רכבות', ['רכבת', 'רכבות'], ['רכבת', 'רכבות']],
      ['a form inside another once', 'אני בבית ספר', ['בית', 'בית ספר'], ['בבית ספר']],
      ['ו inside a word as ktiv male would add it', 'קראתי סיפור', ['ספר'], ['סיפור']],
    ])('finds %s', (_, text, forms, words) => {
      expect(used(text, { forms })).toEqual(words);
    });

    test('gives offsets into the text as given', () => {
      expect(usageRanges('אני בַּבַּיִת', { forms: ['בית'] })).toEqual([{ start: 4, end: 13 }]);
    });

    test.each([
      ['another word', 'הספר על השולחן', ['רכבת']],
      ['the form inside a longer word', 'יש לי ספרים', ['ספר']],
      ['the form after letters that are no prefix', 'ארכבת', ['רכבת']],
      ['more than four prefix letters', 'ושכשהרכבת', ['רכבת']],
      ['only the first word of a form of several', 'אני הולך לבית', ['בֵּית סֵפֶר']],
      ['a form with no Hebrew', 'train ticket', ['', 'train']],
      ['no forms', 'רכבת', []],
    ])('misses %s', (_, text, forms) => {
      expect(used(text, { forms })).toEqual([]);
    });
  });

  describe('for a root', () => {
    test.each([
      ['a conjugation', 'דיברתי עם אמא', 'ד־ב־ר', ['דיברתי']],
      ['a ו or י between its letters', 'אני הולך הביתה', 'ה־ל־ך', ['הולך']],
      ['its last letter in the middle of a word', 'הלכנו הביתה', 'ה־ל־ך', ['הלכנו']],
      ['its letters inside a word with prefixes', 'וכשמדברים', 'ד־ב־ר', ['וכשמדברים']],
      ['a pointed conjugation', 'דִּבַּרְתִּי', 'ד־ב־ר', ['דִּבַּרְתִּי']],
    ])('finds %s', (_, text, root, words) => {
      expect(used(text, { forms: [], root })).toEqual(words);
    });

    test.each([
      ['its letters out of order', 'ברד', 'ד־ב־ר'],
      ['its letters across two words', 'דב רע', 'ד־ב־ר'],
      ['its letters apart by other than ו or י', 'דברתי', 'ד־ר־ב'],
      ['a root of two letters', 'דבר', 'ד־ב'],
    ])('misses %s', (_, text, root) => {
      expect(used(text, { forms: [], root })).toEqual([]);
    });
  });

  describe('for a weak root', () => {
    test.each([
      ['a last ה become י', 'קניתי לחם', 'ק־נ־ה', ['קניתי']],
      ['a last ה become ת', 'היא קנתה לחם', 'ק־נ־ה', ['קנתה']],
      ['a last ה dropped before a ו', 'הם קנו לחם', 'ק־נ־ה', ['קנו']],
      ['a last ה dropped before a י', 'הם קונים לחם', 'ק־נ־ה', ['קונים']],
      ['an infinitive of a last ה', 'אני רוצה לקנות', 'ק־נ־ה', ['לקנות']],
      ['a hitpa’el of a last ה', 'להתראות!', 'ר־א־ה', ['להתראות']],
      ['a last ה after a consonant י', 'היא הייתה שם', 'ה־י־ה', ['הייתה']],
      ['a middle ו dropped', 'קמתי מוקדם', 'ק־ו־ם', ['קמתי']],
      ['a middle ו dropped in a hif’il', 'הם הביאו פרחים', 'ב־ו־א', ['הביאו']],
      ['a first ה dropped after a future’s person', 'מחר אלך הביתה', 'ה־ל־ך', ['אלך']],
      ['a first ה dropped after an infinitive’s ל', 'צריך ללכת', 'ה־ל־ך', ['ללכת']],
      ['a first י dropped after an infinitive’s ל', 'אפשר לשבת כאן', 'י־ש־ב', ['לשבת']],
      ['a first י become a hif’il’s ו', 'הוא מוציא כסף', 'י־צ־א', ['מוציא']],
      ['a first נ dropped, with a י for it', 'מחר ניסע לים', 'נ־ס־ע', ['ניסע']],
      ['a first נ dropped in a hif’il', 'אני מכיר אותו', 'נ־כ־ר', ['מכיר']],
      ['a last נ dropped into a ת', 'נתתי לו ספר', 'נ־ת־ן', ['נתתי']],
      ['a first and a last נ both dropped', 'אפשר לתת לו', 'נ־ת־ן', ['לתת']],
      ['“and when” before a dropped first letter', 'וכשאלך הביתה', 'ה־ל־ך', ['וכשאלך']],
    ])('finds %s', (_, text, root, words) => {
      expect(used(text, { forms: [], root })).toEqual(words);
    });

    test.each([
      ['a last ה dropped with no ending', 'הארץ', 'ר־צ־ה'],
      ['an ending no verb takes', 'זה גרוע', 'ג־ו־ר'],
      ['a ו or י before a dropped last נ', 'תוכנית שנתית', 'נ־ת־ן'],
      ['a ו after a dropped first י', 'זאת תשובה טובה', 'י־ש־ב'],
      ['a prefix letter other than ו, ש or כש before a verb', 'זה בשבילך', 'ה־ל־ך'],
      ['a ש with nothing for a dropped first letter', 'הספר שלך', 'ה־ל־ך'],
      ['a command that dropped its first letter', 'זה לך', 'ה־ל־ך'],
    ])('misses %s', (_, text, root) => {
      expect(used(text, { forms: [], root })).toEqual([]);
    });
  });

  describe('for a form and a root in one word', () => {
    test('gives the word once', () => {
      expect(used('הוא מדבר', { forms: ['מְדַבֵּר'], root: 'ד־ב־ר' })).toEqual(['מדבר']);
    });
  });
});
