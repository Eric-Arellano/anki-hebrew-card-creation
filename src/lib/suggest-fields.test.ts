import { describe, expect, test } from 'vitest';
import notes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with { type: 'json' };
import type { CardInputs, NounInputs } from './card-inputs.ts';
import { FIELDS, type FieldKey } from './note-type.ts';
import { suggestFields } from './suggest-fields.ts';

const dagInputs: CardInputs = {
  word: 'דג',
  partOfSpeech: 'other',
  definitions: ['fish'],
  pointed: 'דָּג',
};

const masculine: NounInputs = {
  pluralOnly: false,
  gender: 'm',
  plural: '',
  feminine: '',
  femininePlural: '',
};

function nounInputs(noun: NounInputs): CardInputs {
  return { ...dagInputs, partOfSpeech: 'noun', noun };
}

/** A field of the real note for `word`, read through `FIELDS` so a renamed field fails here. */
function realField(word: string, field: FieldKey): string {
  const note = notes.find((candidate) => candidate.fields.Hebrew.value === word);
  if (note === undefined) throw new Error(`No fixture note for ${word}`);
  const fields: Record<string, { value: string }> = note.fields;
  // The human typed these in Anki's editor, which keeps some spaces as `&nbsp;`.
  return fields[FIELDS[field].name]?.value.replaceAll('&nbsp;', ' ') ?? '';
}

function realFields(word: string, fields: readonly FieldKey[]) {
  return Object.fromEntries(fields.map((field) => [field, realField(word, field)]));
}

const NOUN_FIELDS = [
  'unpointed',
  'pointed',
  'definitions',
  'productionAnswer',
  'gender',
  'forms',
] as const;

describe('suggestFields', () => {
  describe('for a word that is neither a noun nor a verb', () => {
    test('fills the word, its pointed form, its definition and its production answer', () => {
      expect(suggestFields(dagInputs)).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish',
        productionAnswer: 'דג',
      });
    });
  });

  describe('for a verb', () => {
    test('answers with the word itself', () => {
      expect(suggestFields({ ...dagInputs, partOfSpeech: 'verb' })).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish',
        productionAnswer: 'דג',
      });
    });
  });

  describe('for the real noun notes', () => {
    test('composes דג, which has only a plural', () => {
      expect(suggestFields(nounInputs({ ...masculine, plural: 'דָּגִים' }))).toEqual(
        realFields('דג', NOUN_FIELDS),
      );
    });

    test('composes חתול, which has a feminine counterpart', () => {
      expect(
        suggestFields({
          word: 'חתול',
          pointed: 'חָתוּל',
          definitions: ['cat'],
          partOfSpeech: 'noun',
          noun: {
            pluralOnly: false,
            gender: 'm',
            plural: 'חֲתוּלִים',
            feminine: 'חֲתוּלָה',
            femininePlural: 'חֲתוּלוֹת',
          },
        }),
      ).toEqual(realFields('חתול', NOUN_FIELDS));
    });
  });

  describe('for a noun', () => {
    describe.each([
      ['f', 'דג טובה'],
      ['mf', 'דג טוב'],
    ] as const)('of gender %s', (gender, productionAnswer) => {
      test(`answers ${productionAnswer} and labels its plural pl`, () => {
        expect(suggestFields(nounInputs({ pluralOnly: false, gender, plural: 'דָּגִים' }))).toEqual({
          unpointed: 'דג',
          pointed: 'דָּג',
          definitions: 'fish',
          productionAnswer,
          gender,
          forms: 'pl: דָּגִים',
        });
      });
    });

    describe('that is only plural', () => {
      test('answers in the plural and has no forms', () => {
        expect(
          suggestFields({
            word: 'מים',
            pointed: 'מַיִם',
            definitions: ['water'],
            partOfSpeech: 'noun',
            noun: { pluralOnly: true, gender: 'm' },
          }),
        ).toEqual({
          unpointed: 'מים',
          pointed: 'מַיִם',
          definitions: 'water',
          productionAnswer: 'מים טובים',
          gender: 'm',
          forms: '',
        });
      });
    });

    describe('with only a feminine plural', () => {
      test('labels the forms as a feminine counterpart', () => {
        expect(suggestFields(nounInputs({ ...masculine, femininePlural: 'כְּלָבוֹת' })).forms).toBe(
          'f.pl: כְּלָבוֹת',
        );
      });
    });

    describe('with no forms', () => {
      test('leaves the forms blank', () => {
        expect(suggestFields(nounInputs(masculine)).forms).toBe('');
      });
    });
  });

  describe('with several meanings', () => {
    test('numbers them, one per line', () => {
      expect(
        suggestFields({ ...dagInputs, definitions: ['fish', 'Pisces & co'] }).definitions,
      ).toBe('1. fish<br>2. Pisces &amp; co');
    });
  });

  describe('when the inputs need cleaning', () => {
    test('trims them and escapes HTML', () => {
      expect(
        suggestFields({
          word: ' דג ',
          partOfSpeech: 'other',
          definitions: ['fish & chips'],
          pointed: ' דָּג ',
        }),
      ).toEqual({
        unpointed: 'דג',
        pointed: 'דָּג',
        definitions: 'fish &amp; chips',
        productionAnswer: 'דג',
      });
    });

    test('trims and escapes a noun’s forms', () => {
      expect(
        suggestFields({
          word: 'דג',
          partOfSpeech: 'noun',
          definitions: ['fish & chips'],
          pointed: 'דָּג',
          noun: {
            pluralOnly: false,
            gender: 'm',
            plural: ' <b> ',
            feminine: ' דָּגָה ',
            femininePlural: '',
          },
        }).forms,
      ).toBe('f: דָּגָה<br>m.pl: &lt;b&gt;');
    });
  });

  describe('when the inputs are blank', () => {
    test('suggests blank fields', () => {
      expect(
        suggestFields({ word: '', partOfSpeech: 'other', definitions: [''], pointed: '' }),
      ).toEqual({
        unpointed: '',
        pointed: '',
        definitions: '',
        productionAnswer: '',
      });
    });
  });
});
