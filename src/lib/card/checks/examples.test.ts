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
  test('gives the rows whose Hebrew uses no form of the word', () => {
    expect(
      examplesWithoutWord({
        examples: [
          { hebrew: 'כרטיס רכבת.', english: 'A train ticket.' },
          { hebrew: ' ', english: 'The bus is late.' },
          { hebrew: 'האוטובוס מאחר.', english: 'The bus is late.' },
        ],
        inputs: rakevet,
        formsField: '',
      }),
    ).toEqual([2]);
  });

  describe('while the word is blank', () => {
    test('gives none', () => {
      expect(
        examplesWithoutWord({
          examples: [{ hebrew: 'האוטובוס מאחר', english: 'the bus is late' }],
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
          examples: [{ hebrew: 'הרכבות מאחרות', english: 'the trains are late' }],
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
          examples: [{ hebrew: 'דיברתי עם אמא', english: 'I talked with Mom' }],
          inputs: ledaber,
          formsField: '',
        }),
      ).toEqual([]);
    });

    describe('with a blank root', () => {
      test('accepts only its forms', () => {
        expect(
          examplesWithoutWord({
            examples: [
              { hebrew: 'דיברתי עם אמא', english: 'I talked with Mom' },
              { hebrew: 'הוא מדבר מהר', english: 'he talks fast' },
            ],
            inputs: { ...ledaber, root: '', verb: { ...ledaber.verb, present: 'מְדַבֵּר' } },
            formsField: '',
          }),
        ).toEqual([0]);
      });
    });
  });

  describe('for a noun with a root', () => {
    test('accepts no other word of the root', () => {
      expect(
        examplesWithoutWord({
          examples: [{ hebrew: 'הספרייה סגורה', english: 'the library is closed' }],
          inputs: { ...emptyInputsDraft(), word: 'ספר', partOfSpeech: 'noun', root: 'ס־פ־ר' },
          formsField: '',
        }),
      ).toEqual([0]);
    });
  });

  describe('for a preposition', () => {
    test('accepts the forms typed after their labels', () => {
      expect(
        examplesWithoutWord({
          examples: [{ hebrew: 'הוא עמד לפניי', english: 'he stood before me' }],
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
