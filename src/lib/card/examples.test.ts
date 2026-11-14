import { describe, expect, test } from 'vitest';
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { type CardInputsDraft, emptyInputsDraft } from '#lib/card/inputs.ts';
import { realField } from '#tests/real-notes.ts';
import {
  blankExample,
  examplesFromHtml,
  examplesToAnkiFieldHtml,
  labeledForms,
} from './examples.ts';

describe('examplesToAnkiFieldHtml', () => {
  test('keeps the punctuation ending the Hebrew inside its own line', () => {
    expect(
      examplesToAnkiFieldHtml([
        { hebrew: 'נסענו ברכבת לחיפה.', english: 'We took the train to Haifa.' },
        { hebrew: ' איפה הרכבת? ', english: ' Where is the train? ' },
      ]),
    ).toBe(
      '<bdi lang="he">נסענו ברכבת לחיפה.</bdi><span class="sep"> — </span>' +
        '<span lang="en">We took the train to Haifa.</span><br>' +
        '<bdi lang="he">איפה הרכבת?</bdi><span class="sep"> — </span>' +
        '<span lang="en">Where is the train?</span>',
    );
  });

  test('escapes what would be markup', () => {
    expect(examplesToAnkiFieldHtml([{ hebrew: 'א<ב', english: 'cats & dogs' }])).toBe(
      '<bdi lang="he">א&lt;ב</bdi><span class="sep"> — </span><span lang="en">cats &amp; dogs</span>',
    );
  });

  test('writes only the side that is filled, and drops blank rows', () => {
    expect(
      examplesToAnkiFieldHtml([
        { hebrew: 'רכבת.', english: ' ' },
        blankExample(),
        { hebrew: '', english: 'A train.' },
      ]),
    ).toBe('<bdi lang="he">רכבת.</bdi><br><span lang="en">A train.</span>');
  });

  test('gives an empty field for no examples', () => {
    expect(examplesToAnkiFieldHtml([blankExample()])).toBe('');
  });
});

describe('examplesFromHtml', () => {
  test.each([
    [
      'both sides',
      [
        { hebrew: 'נסענו ברכבת לחיפה.', english: 'We took the train to Haifa.' },
        { hebrew: 'איפה הרכבת?', english: 'Where is the train?' },
      ],
    ],
    ['markup characters', [{ hebrew: 'א<ב & ג', english: 'cats & (big) dogs' }]],
    ['only the Hebrew', [{ hebrew: 'רכבת!', english: '' }]],
    ['only the English', [{ hebrew: '', english: 'A train.' }]],
  ])('reads back what composition writes, with %s', (_, examples) => {
    expect(examplesFromHtml(examplesToAnkiFieldHtml(examples))).toEqual(examples);
  });

  test('skips blank lines', () => {
    expect(examplesFromHtml('<br><bdi lang="he">רכבת.</bdi><br> <br/>')).toEqual([
      { hebrew: 'רכבת.', english: '' },
    ]);
  });

  describe('for a line in another format', () => {
    test('loads it whole into the Hebrew', () => {
      expect(examplesFromHtml(realField('כרטיס', 'Examples'))).toEqual([
        { hebrew: 'כרטיס רכבת (train ticket)', english: '' },
      ]);
    });

    test.each([
      ['two Hebrew parts', '<bdi lang="he">רכבת</bdi> (train) <bdi lang="he">כרטיס</bdi>'],
      ['English with no separator', '<bdi lang="he">רכבת</bdi><span lang="en">train</span>'],
      ['English in parentheses', '<bdi lang="he">רכבת</bdi> (train)'],
    ])('keeps %s together, rather than guess them apart', (_, line) => {
      expect(examplesFromHtml(line)).toEqual([{ hebrew: ankiFieldHtmlToText(line), english: '' }]);
    });
  });

  describe('for an empty field', () => {
    test('gives one blank row', () => {
      expect(examplesFromHtml('')).toEqual([blankExample()]);
    });
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
