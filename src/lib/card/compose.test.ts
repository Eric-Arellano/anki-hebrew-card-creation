import { describe, expect, test } from 'vitest';
import type { AdjectiveInputs } from '#lib/card/parts-of-speech/adjective.ts';
import type { NounInputs } from '#lib/card/parts-of-speech/noun.ts';
import { FIELDS, type FieldKey } from '#lib/note-type.ts';
import { realNote } from '#tests/real-notes.ts';
import { composeFields } from './compose.ts';
import type { CardInputs } from './inputs.ts';

const dagInputs: CardInputs = {
  word: 'דג',
  partOfSpeech: 'other',
  meanings: [{ english: 'fish' }],
  wordPointed: 'דָּג',
};

const masculine: NounInputs = {
  pluralOnly: false,
  gender: 'm',
  plural: '',
  feminine: '',
  femininePlural: '',
};

function nounInputs(noun: NounInputs): CardInputs {
  return { ...dagInputs, partOfSpeech: 'noun', noun, root: '' };
}

/** A field of the real note for `word`, read through `FIELDS` so a renamed field fails here. */
function realField(word: string, field: FieldKey): string {
  // The human typed these in Anki's editor, which keeps some spaces as `&nbsp;`.
  return (realNote(word)[FIELDS[field].name] ?? '').replaceAll('&nbsp;', ' ');
}

function realFields(word: string, fields: readonly FieldKey[]) {
  return Object.fromEntries(fields.map((field) => [field, realField(word, field)]));
}

// Without `partOfSpeech`, which the real notes predate.
const NOUN_FIELDS = [
  'word',
  'wordPointed',
  'meanings',
  'answer',
  'gender',
  'forms',
  'root',
] as const;

describe('composeFields', () => {
  describe('for a word that is neither a noun nor a verb', () => {
    test('fills the word, its pointed form, its definition and its production answer', () => {
      expect(composeFields(dagInputs)).toEqual({
        word: 'דג',
        partOfSpeech: 'other',
        wordPointed: 'דָּג',
        meanings: 'fish',
        answer: 'דג',
      });
    });
  });

  describe.each(['adverb', 'phrase'] as const)(
    'for a word of part of speech %s',
    (partOfSpeech) => {
      test('answers with the word alone', () => {
        expect(
          composeFields({
            word: 'מה נשמע',
            wordPointed: 'מַה נִּשְׁמַע',
            meanings: [{ english: 'how are you?' }],
            partOfSpeech,
          }),
        ).toEqual({
          word: 'מה נשמע',
          partOfSpeech,
          wordPointed: 'מַה נִּשְׁמַע',
          meanings: 'how are you?',
          answer: 'מה נשמע',
        });
      });
    },
  );

  describe('for a preposition', () => {
    test('answers without a trailing maqaf, and keeps it in the word', () => {
      expect(
        composeFields({
          word: 'חוץ מ־',
          wordPointed: 'חוּץ מִ־',
          meanings: [{ english: 'except for' }],
          partOfSpeech: 'preposition',
        }),
      ).toEqual({
        word: 'חוץ מ־',
        partOfSpeech: 'preposition',
        wordPointed: 'חוּץ מִ־',
        meanings: 'except for',
        answer: 'חוץ מ',
      });
    });
  });

  describe('for a verb', () => {
    const noForms = { past: '', unpointedPast: 'דיבר', present: '', future: '' };
    const ledaber = {
      word: 'לדבר',
      wordPointed: 'לְדַבֵּר',
      meanings: [{ english: 'to speak', preposition: 'עם' }],
      partOfSpeech: 'verb',
      root: '',
    } as const;

    test('answers with the infinitive and past, and writes its prepositions, binyan, root and forms', () => {
      expect(
        composeFields({
          ...ledaber,
          root: 'ד־ב־ר',
          verb: {
            binyan: "pi'el",
            past: 'דִּבֵּר',
            unpointedPast: ' דיבר ',
            present: 'מְדַבֵּר',
            future: 'יְדַבֵּר',
          },
        }),
      ).toEqual({
        word: 'לדבר',
        partOfSpeech: 'verb',
        wordPointed: 'לְדַבֵּר',
        meanings: 'to speak <span class="prep"><bdi lang="he">עִם</bdi></span>',
        answer: 'לדבר דיבר',
        binyan: "pi'el",
        root: 'ד־ב־ר',
        forms: 'past: דִּבֵּר<br>pres: מְדַבֵּר<br>fut: יְדַבֵּר',
      });
    });

    describe('with only some of its forms', () => {
      test('leaves the blank ones out', () => {
        expect(
          composeFields({
            ...ledaber,
            verb: { ...noForms, binyan: "pi'el", past: 'דִּבֵּר', future: ' ' },
          }).forms,
        ).toBe('past: דִּבֵּר');
      });
    });

    describe('with none of its forms', () => {
      test('leaves them blank', () => {
        expect(composeFields({ ...ledaber, verb: { ...noForms, binyan: "pi'el" } }).forms).toBe('');
      });
    });

    describe("in pu'al, which has no infinitive", () => {
      test('answers with the past alone', () => {
        expect(
          composeFields({
            ...ledaber,
            word: 'דובר',
            wordPointed: 'דֻּבַּר',
            verb: { binyan: "pu'al", past: 'דֻּבַּר', present: '', future: '' },
          }).answer,
        ).toBe('דובר');
      });
    });
  });

  describe('for an adjective', () => {
    function adjectiveFields(adjective: AdjectiveInputs) {
      return composeFields({
        word: 'גדול',
        wordPointed: 'גָּדוֹל',
        meanings: [{ english: 'big' }],
        partOfSpeech: 'adjective',
        root: 'ג־ד־ל',
        adjective,
      });
    }

    test('answers with the word alone, labels its forms, and writes its root', () => {
      expect(
        adjectiveFields({
          feminine: 'גְּדוֹלָה',
          masculinePlural: 'גְּדוֹלִים',
          femininePlural: 'גְּדוֹלוֹת',
        }),
      ).toEqual({
        word: 'גדול',
        partOfSpeech: 'adjective',
        wordPointed: 'גָּדוֹל',
        meanings: 'big',
        answer: 'גדול',
        forms: 'f: גְּדוֹלָה<br>m.pl: גְּדוֹלִים<br>f.pl: גְּדוֹלוֹת',
        root: 'ג־ד־ל',
      });
    });

    describe('with a blank form', () => {
      test('leaves its line out', () => {
        expect(
          adjectiveFields({ feminine: 'גְּדוֹלָה', masculinePlural: ' ', femininePlural: '' }).forms,
        ).toBe('f: גְּדוֹלָה');
      });
    });
  });

  describe('for the real noun notes', () => {
    test('composes דג, which has only a plural', () => {
      expect(composeFields(nounInputs({ ...masculine, plural: 'דָּגִים' }))).toEqual({
        ...realFields('דג', NOUN_FIELDS),
        partOfSpeech: 'noun',
      });
    });

    test('composes חתול, which has a feminine counterpart', () => {
      expect(
        composeFields({
          word: 'חתול',
          wordPointed: 'חָתוּל',
          meanings: [{ english: 'cat' }],
          partOfSpeech: 'noun',
          root: '',
          noun: {
            pluralOnly: false,
            gender: 'm',
            plural: 'חֲתוּלִים',
            feminine: 'חֲתוּלָה',
            femininePlural: 'חֲתוּלוֹת',
          },
        }),
      ).toEqual({
        ...realFields('חתול', NOUN_FIELDS),
        partOfSpeech: 'noun',
      });
    });
  });

  describe('for a noun', () => {
    describe.each([
      ['f', 'דג טובה'],
      ['mf', 'דג טוב'],
    ] as const)('of gender %s', (gender, answer) => {
      test(`answers ${answer} and labels its plural pl`, () => {
        expect(composeFields(nounInputs({ pluralOnly: false, gender, plural: 'דָּגִים' }))).toEqual({
          word: 'דג',
          partOfSpeech: 'noun',
          wordPointed: 'דָּג',
          meanings: 'fish',
          answer,
          gender,
          forms: 'pl: דָּגִים',
          root: '',
        });
      });
    });

    describe('with a root', () => {
      test('writes it', () => {
        expect(composeFields({ ...nounInputs(masculine), root: 'כ־ת־ב' } as CardInputs).root).toBe(
          'כ־ת־ב',
        );
      });
    });

    describe('that is only plural', () => {
      test('answers in the plural and has no forms', () => {
        expect(
          composeFields({
            word: 'מים',
            wordPointed: 'מַיִם',
            meanings: [{ english: 'water' }],
            partOfSpeech: 'noun',
            root: 'מ־י־ם',
            noun: { pluralOnly: true, gender: 'm' },
          }),
        ).toEqual({
          word: 'מים',
          partOfSpeech: 'noun',
          wordPointed: 'מַיִם',
          meanings: 'water',
          answer: 'מים טובים',
          gender: 'm',
          forms: '',
          root: 'מ־י־ם',
        });
      });
    });

    describe('with only a feminine plural', () => {
      test('labels the forms as a feminine counterpart', () => {
        expect(composeFields(nounInputs({ ...masculine, femininePlural: 'כְּלָבוֹת' })).forms).toBe(
          'f.pl: כְּלָבוֹת',
        );
      });
    });

    describe('with a feminine counterpart of only spaces', () => {
      test('labels its plural pl', () => {
        expect(
          composeFields(
            nounInputs({ ...masculine, plural: 'דָּגִים', feminine: ' ', femininePlural: ' ' }),
          ).forms,
        ).toBe('pl: דָּגִים');
      });
    });

    describe('with no forms', () => {
      test('leaves the forms blank', () => {
        expect(composeFields(nounInputs(masculine)).forms).toBe('');
      });
    });
  });

  describe('with several meanings', () => {
    test('numbers them, one per line', () => {
      expect(
        composeFields({
          ...dagInputs,
          meanings: [{ english: 'fish' }, { english: 'Pisces & co' }],
        }).meanings,
      ).toBe('1. fish<br>2. Pisces &amp; co');
    });
  });

  describe('when the inputs need cleaning', () => {
    test('trims them and escapes HTML', () => {
      expect(
        composeFields({
          word: ' דג ',
          partOfSpeech: 'other',
          meanings: [{ english: 'fish & chips' }],
          wordPointed: ' דָּג ',
        }),
      ).toEqual({
        word: 'דג',
        partOfSpeech: 'other',
        wordPointed: 'דָּג',
        meanings: 'fish &amp; chips',
        answer: 'דג',
      });
    });

    test('trims and escapes a noun’s forms', () => {
      expect(
        composeFields({
          word: 'דג',
          partOfSpeech: 'noun',
          meanings: [{ english: 'fish & chips' }],
          wordPointed: 'דָּג',
          root: '',
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
        composeFields({
          word: '',
          partOfSpeech: 'other',
          meanings: [{ english: '' }],
          wordPointed: '',
        }),
      ).toEqual({
        word: '',
        partOfSpeech: 'other',
        wordPointed: '',
        meanings: '',
        answer: '',
      });
    });
  });
});
