import { describe, expect, test } from 'vitest';
import { type CardInputsDraft, emptyInputsDraft } from '#lib/card/inputs.ts';
import { examplesWithoutWord } from './examples.ts';

const rakevet: CardInputsDraft = {
  ...emptyInputsDraft(),
  word: 'רכבת',
  pointed: 'רַכֶּבֶת',
  partOfSpeech: 'noun',
};

describe('examplesWithoutWord', () => {
  test('gives the lines that use no form of the word, as Anki shows them', () => {
    expect(
      examplesWithoutWord({
        examples: 'כרטיס רכבת (train ticket)\n\nהאוטובוס <b>מאחר</b> (the bus is late)\n',
        inputs: rakevet,
        formsField: '',
      }),
    ).toEqual(['האוטובוס מאחר (the bus is late)']);
  });

  describe('while the word is blank', () => {
    test('gives none', () => {
      expect(
        examplesWithoutWord({
          examples: 'האוטובוס מאחר (the bus is late)',
          inputs: { ...rakevet, word: ' ' },
          formsField: '',
        }),
      ).toEqual([]);
    });
  });

  describe('for a noun', () => {
    test('accepts its plural', () => {
      expect(
        examplesWithoutWord({
          examples: 'הרכבות מאחרות (the trains are late)',
          inputs: { ...rakevet, noun: { ...rakevet.noun, plural: 'רַכָּבוֹת' } },
          formsField: '',
        }),
      ).toEqual([]);
    });
  });

  describe('for a verb', () => {
    const ledaber: CardInputsDraft = {
      ...emptyInputsDraft(),
      word: 'לדבר',
      pointed: 'לְדַבֵּר',
      partOfSpeech: 'verb',
      root: 'ד.ב.ר',
    };

    test('accepts any conjugation of its root', () => {
      expect(
        examplesWithoutWord({
          examples: 'דיברתי עם אמא (I talked with Mom)',
          inputs: ledaber,
          formsField: '',
        }),
      ).toEqual([]);
    });

    describe('with a blank root', () => {
      test('accepts only its forms', () => {
        expect(
          examplesWithoutWord({
            examples: 'דיברתי עם אמא (I talked with Mom)\nהוא מדבר מהר (he talks fast)',
            inputs: { ...ledaber, root: '', verb: { ...ledaber.verb, present: 'מְדַבֵּר' } },
            formsField: '',
          }),
        ).toEqual(['דיברתי עם אמא (I talked with Mom)']);
      });
    });
  });

  describe('for a noun with a root', () => {
    test('accepts no other word of the root', () => {
      expect(
        examplesWithoutWord({
          examples: 'הספרייה סגורה (the library is closed)',
          inputs: { ...emptyInputsDraft(), word: 'ספר', partOfSpeech: 'noun', root: 'ס־פ־ר' },
          formsField: '',
        }),
      ).toEqual(['הספרייה סגורה (the library is closed)']);
    });
  });

  describe('for a preposition', () => {
    test('accepts the forms typed after their labels', () => {
      expect(
        examplesWithoutWord({
          examples: 'הוא עמד לפניי (he stood before me)',
          inputs: {
            ...emptyInputsDraft(),
            word: 'לפני',
            pointed: 'לִפְנֵי',
            partOfSpeech: 'preposition',
          },
          formsField: 'me: לְפָנַי\nus: לְפָנֵינוּ',
        }),
      ).toEqual([]);
    });
  });
});
