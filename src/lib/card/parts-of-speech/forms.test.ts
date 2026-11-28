import { describe, expect, test } from 'vitest';
import { type CardInputsDraft, emptyInputsDraft } from '#lib/card/inputs.ts';
import { type FormLine, formsByLabel, formsHtml, labeledForms, wordUsage } from './forms.ts';

describe('formsByLabel', () => {
  test('reads what formsHtml writes', () => {
    const lines: FormLine[] = [
      ['f', 'כַּלְבָּה'],
      ['m.pl', 'כְּלָבִים & co'],
    ];
    expect([...formsByLabel(formsHtml(lines))]).toEqual(lines);
  });

  test('reads a line Anki’s editor spaced with &nbsp;', () => {
    expect(formsByLabel('f:&nbsp;חֲתוּלָה').get('f')).toBe('חֲתוּלָה');
  });

  test('leaves out a line with no label', () => {
    expect([...formsByLabel('כְּלָבִים<br>pl: דָּגִים')]).toEqual([['pl', 'דָּגִים']]);
  });

  test('keeps the first of a label given twice', () => {
    expect(formsByLabel('pl: דָּגִים<br>pl: דָּגוֹת').get('pl')).toBe('דָּגִים');
  });

  test('is empty for a blank field', () => {
    expect(formsByLabel('').size).toBe(0);
  });
});

describe('labeledForms', () => {
  const blank = emptyInputsDraft();

  function inputsFor(partOfSpeech: CardInputsDraft['partOfSpeech']): CardInputsDraft {
    return {
      ...blank,
      partOfSpeech,
      noun: { ...blank.noun, plural: 'כְּלָבִים', feminine: ' כַּלְבָּה ', femininePlural: 'כְּלָבוֹת' },
      verb: { ...blank.verb, past: 'הָלַךְ', present: 'הוֹלֵךְ', future: 'יֵלֵךְ' },
      adjective: { feminine: 'גְּדוֹלָה', masculinePlural: 'גְּדוֹלִים', femininePlural: 'גְּדוֹלוֹת' },
    };
  }

  test.each([
    [
      'noun',
      [
        { label: 'plural', form: 'כְּלָבִים' },
        { label: 'feminine', form: 'כַּלְבָּה' },
        { label: 'feminine plural', form: 'כְּלָבוֹת' },
      ],
    ],
    [
      'verb',
      [
        { label: 'past (he)', form: 'הָלַךְ' },
        { label: 'present (he)', form: 'הוֹלֵךְ' },
        { label: 'future (he)', form: 'יֵלֵךְ' },
      ],
    ],
    [
      'adjective',
      [
        { label: 'feminine', form: 'גְּדוֹלָה' },
        { label: 'masculine plural', form: 'גְּדוֹלִים' },
        { label: 'feminine plural', form: 'גְּדוֹלוֹת' },
      ],
    ],
    ['adverb', []],
    ['phrase', []],
    [undefined, []],
  ] as const)('labels a %s’s forms, trimmed', (partOfSpeech, forms) => {
    expect(labeledForms(inputsFor(partOfSpeech), 'me: לְפָנַי')).toEqual(forms);
  });

  test('leaves out a blank form', () => {
    const inputs = {
      ...inputsFor('noun'),
      noun: { ...blank.noun, plural: 'כְּלָבִים', feminine: ' ' },
    };
    expect(labeledForms(inputs, '')).toEqual([{ label: 'plural', form: 'כְּלָבִים' }]);
  });

  describe.each(['preposition', 'other'] as const)('for a %s', (partOfSpeech) => {
    test('labels each line of Forms by its own label', () => {
      expect(
        labeledForms(inputsFor(partOfSpeech), 'me: לְפָנַי\nbefore a noun:  שְׁנֵי \n\nus:'),
      ).toEqual([
        { label: 'me', form: 'לְפָנַי' },
        { label: 'before a noun', form: 'שְׁנֵי' },
      ]);
    });

    test('gives a line with no label a blank one', () => {
      expect(labeledForms(inputsFor(partOfSpeech), 'לְפָנַי')).toEqual([{ label: '', form: 'לְפָנַי' }]);
    });
  });
});

describe('wordUsage', () => {
  const ledaber: CardInputsDraft = {
    ...emptyInputsDraft(),
    word: 'לדבר',
    wordPointed: 'לְדַבֵּר',
    partOfSpeech: 'verb',
    root: 'ד.ב.ר',
    verb: { ...emptyInputsDraft().verb, present: 'מְדַבֵּר' },
  };

  test('gives the word, pointed and not, its other forms, and a verb’s root', () => {
    expect(wordUsage(ledaber, '')).toEqual({
      forms: ['לדבר', 'לְדַבֵּר', 'מְדַבֵּר'],
      root: 'ד־ב־ר',
    });
  });

  test.each(['noun', 'adjective'] as const)('leaves out a %s’s root', (partOfSpeech) => {
    expect(wordUsage({ ...ledaber, partOfSpeech }, '').root).toBeUndefined();
  });

  test('takes a preposition’s forms from the Forms field', () => {
    const lifnei = { ...emptyInputsDraft(), word: 'לפני', partOfSpeech: 'preposition' } as const;
    expect(wordUsage(lifnei, 'me: לְפָנַי').forms).toEqual(['לפני', '', 'לְפָנַי']);
  });
});
