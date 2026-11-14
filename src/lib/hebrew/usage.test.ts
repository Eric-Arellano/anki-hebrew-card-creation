import { describe, expect, test } from 'vitest';
import { usesForm, usesRoot } from './usage.ts';

describe('usesForm', () => {
  test.each([
    ['the form alone', 'כרטיס רכבת (train ticket)', ['רכבת']],
    ['a pointed form', 'כרטיס רכבת (train ticket)', ['רַכֶּבֶת']],
    ['a pointed text', 'כַּרְטִיס רַכֶּבֶת', ['רכבת']],
    ['ktiv male for a form in ktiv haser', 'השולחן גדול', ['שֻׁלְחָן']],
    ['a prefix letter', 'הרכבת מאחרת (the train is late)', ['רכבת']],
    ['stacked prefix letters', 'וכשהרכבת הגיעה', ['רכבת']],
    ['a form that starts with a prefix letter', 'אני בבית', ['בית']],
    ['a form of several words', 'יש בית ספר חדש', ['בֵּית סֵפֶר']],
    ['a form of several words with prefixes on each', 'אני הולך לבית הספר', ['בֵּית סֵפֶר']],
    ['a form joined by a maqaf', 'אני הולך לבית ספר', ['בֵּית־סֵפֶר']],
    ['a one-letter preposition among the prefixes', 'הספר בבית', ['ב']],
    ['a geresh typed with an apostrophe', "ראיתי ג'ירפה", ['ג׳ירפה']],
  ])('finds %s', (_, text, forms) => {
    expect(usesForm(text, forms)).toBe(true);
  });

  test.each([
    ['another word', 'הספר על השולחן', ['רכבת']],
    ['the form inside a longer word', 'יש לי ספרים', ['ספר']],
    ['the form after letters that are no prefix', 'ארכבת', ['רכבת']],
    ['more than four prefix letters', 'ושכשהרכבת', ['רכבת']],
    ['only the first word of a form of several', 'אני הולך לבית', ['בֵּית סֵפֶר']],
    ['a form with no Hebrew', 'train ticket', ['', 'train']],
  ])('misses %s', (_, text, forms) => {
    expect(usesForm(text, forms)).toBe(false);
  });
});

describe('usesRoot', () => {
  test.each([
    ['a conjugation', 'דיברתי עם אמא', 'ד־ב־ר'],
    ['a ו or י between its letters', 'אני הולך הביתה', 'ה־ל־ך'],
    ['its last letter in the middle of a word', 'הלכנו הביתה', 'ה־ל־ך'],
    ['its letters inside a word with prefixes', 'וכשמדברים', 'ד־ב־ר'],
  ])('finds %s', (_, text, root) => {
    expect(usesRoot(text, root)).toBe(true);
  });

  test.each([
    ['its letters out of order', 'ברד', 'ד־ב־ר'],
    ['its letters across two words', 'דב רע', 'ד־ב־ר'],
    ['its letters apart by other than ו or י', 'דברתי', 'ד־ר־ב'],
    ['a root of two letters', 'דבר', 'ד־ב'],
  ])('misses %s', (_, text, root) => {
    expect(usesRoot(text, root)).toBe(false);
  });
});
