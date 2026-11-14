import { describe, expect, test } from 'vitest';
import { ankiFieldHtmlToText } from '#lib/anki/html.ts';
import { realField } from '#tests/real-notes.ts';
import { blankExample, examplesFromHtml, examplesToAnkiFieldHtml } from './examples.ts';

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
