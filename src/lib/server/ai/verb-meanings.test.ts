import { describe, expect, test } from 'vitest';
import type { VerbMeaningsRequest } from '#lib/api/ai.ts';
import { VERB_MEANING_PREPOSITION_HELP } from '#lib/field-help.ts';
import { fakeClaude } from '#tests/fake-claude.ts';
import verbMeaningsLishmor from '#tests/fixtures/claude/verb-meanings-lishmor.json' with {
  type: 'json',
};
import {
  suggestVerbMeanings,
  toVerbMeaningSuggestions,
  verbMeaningLines,
  verbMeaningsPrompt,
} from './verb-meanings.ts';

// As the dictionary has שָׁמַר.
const lishmor: VerbMeaningsRequest = {
  word: 'לשמור',
  pointed: 'לִשְׁמֹר',
  meanings: [{ english: 'to keep, guard' }],
  dictionaryDefinitions: ['to guard', '(by extension) to keep', '(computing) to save'],
  dictionaryPrepositions: [],
};

type AnswerLine = Parameters<typeof toVerbMeaningSuggestions>[0]['meanings'][number];

function answerLine(line: Partial<AnswerLine> = {}): AnswerLine {
  return {
    from: null,
    english: 'to keep',
    usage: 'שומר את הקבלה',
    preposition: 'את',
    note: null,
    ...line,
  };
}

describe('verbMeaningLines', () => {
  test('numbers each meaning, ending in its preposition, none, or that none is chosen', () => {
    expect(
      verbMeaningLines([
        { english: 'to keep', preposition: 'את' },
        { english: 'to sleep', preposition: 'none' },
        { english: 'to guard' },
      ]),
    ).toBe('1. to keep [את]\n2. to sleep [none]\n3. to guard [not chosen]');
  });
});

describe('verbMeaningsPrompt', () => {
  test('sends the verb, its niqqud, the dictionary’s definitions and the learner’s lines', () => {
    expect(verbMeaningsPrompt(lishmor).user).toBe(
      [
        'Verb: לשמור',
        'With niqqud: לִשְׁמֹר',
        'Dictionary definitions:',
        '- to guard',
        '- (by extension) to keep',
        '- (computing) to save',
        'The learner’s lines:',
        '1. to keep, guard [not chosen]',
      ].join('\n'),
    );
  });

  test('gives the help the learner reads', () => {
    const { system } = verbMeaningsPrompt(lishmor);
    expect(system).toContain(VERB_MEANING_PREPOSITION_HELP.lead);
    for (const line of VERB_MEANING_PREPOSITION_HELP.cases) expect(system).toContain(`- ${line}`);
  });

  describe('with the dictionary’s prepositions', () => {
    test('names them for the whole verb', () => {
      const { user } = verbMeaningsPrompt({ ...lishmor, dictionaryPrepositions: ['ל'] });
      expect(user).toContain(
        'Prepositions the dictionary names for the verb, though not for which meaning: ל',
      );
    });
  });

  describe('with nothing but the verb and a line', () => {
    test('leaves out the niqqud and the definitions', () => {
      const { user } = verbMeaningsPrompt({ ...lishmor, pointed: ' ', dictionaryDefinitions: [] });
      expect(user).toBe('Verb: לשמור\nThe learner’s lines:\n1. to keep, guard [not chosen]');
    });
  });

  describe('with no lines yet', () => {
    test('says so', () => {
      expect(verbMeaningsPrompt({ ...lishmor, meanings: [] }).user).toMatch(
        /\nThe learner has written no lines yet\.$/,
      );
    });
  });
});

describe('toVerbMeaningSuggestions', () => {
  test('turns Claude’s numbering into a `fromIndex` from 0, and trims what it keeps', () => {
    expect(
      toVerbMeaningSuggestions(
        { meanings: [answerLine({ from: 1, english: ' to keep ', note: ' ok ' })] },
        1,
      ),
    ).toEqual({
      meanings: [
        { english: 'to keep', preposition: 'את', fromIndex: 0, usage: 'שומר את הקבלה', note: 'ok' },
      ],
    });
  });

  describe('a `from` that names none of the lines', () => {
    test.each([0, 2])('is a meaning Claude added, for %i', (from) => {
      expect(toVerbMeaningSuggestions({ meanings: [answerLine({ from })] }, 1).meanings).toEqual([
        { english: 'to keep', preposition: 'את', usage: 'שומר את הקבלה' },
      ]);
    });
  });

  describe('English that fails a guard', () => {
    test.each([
      ['Hebrew', 'to keep את'],
      ['markup', 'to keep <b>'],
      ['a line break', 'to keep\nto guard'],
      ['nothing', ' '],
    ])('drops the meaning, for %s', (_, english) => {
      expect(toVerbMeaningSuggestions({ meanings: [answerLine({ english })] }, 0).meanings).toEqual(
        [],
      );
    });
  });

  describe('a usage that fails a guard', () => {
    test.each([
      ['niqqud', 'שׁוֹמֵר אֶת הַקַּבָּלָה'],
      ['English', 'שומר את the receipt'],
      ['nothing', ''],
    ])('leaves it off, for %s', (_, usage) => {
      expect(toVerbMeaningSuggestions({ meanings: [answerLine({ usage })] }, 0).meanings).toEqual([
        { english: 'to keep', preposition: 'את' },
      ]);
    });
  });

  describe('a note that fails a guard', () => {
    test('leaves it off', () => {
      expect(
        toVerbMeaningSuggestions({ meanings: [answerLine({ note: 'a <b>bold</b> note' })] }, 0)
          .meanings,
      ).toEqual([{ english: 'to keep', preposition: 'את', usage: 'שומר את הקבלה' }]);
    });
  });
});

describe('suggestVerbMeanings', () => {
  test('answers with Claude’s meanings, each pointing at the line it splits', async () => {
    const messages = fakeClaude(verbMeaningsLishmor);
    expect(await suggestVerbMeanings(lishmor, messages)).toEqual({
      meanings: [
        { english: 'to keep', preposition: 'את', fromIndex: 0, usage: 'שומר את הקבלה' },
        {
          english: 'to guard, look after',
          preposition: 'על',
          fromIndex: 0,
          usage: 'שומר על הילדים',
        },
      ],
    });
  });
});
