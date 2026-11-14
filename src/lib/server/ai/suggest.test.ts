import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, test, vi } from 'vitest';
import type { SuggestRequest } from '#lib/api/ai.ts';
import { FIELD_HELP } from '#lib/field-help.ts';
import suggestSefer from '#tests/fixtures/claude/suggest-sefer.json' with { type: 'json' };
import type { ClaudeMessages } from './client.ts';
import type { Homograph } from './homographs.ts';
import { suggest, suggestionRequest, toSuggestions } from './suggest.ts';

const sefer: SuggestRequest = {
  word: 'ספר',
  pointed: 'סֵפֶר',
  partOfSpeech: 'noun',
  definitions: ['book', '(archaic) a writing'],
  forms: [],
};

const seferHomographs: Homograph[] = [
  { pointed: 'סַפָּר', partOfSpeech: 'noun', definitions: ['barber'] },
  { pointed: 'סָפַר', partOfSpeech: 'verb', definitions: ['to count'] },
  { pointed: 'סְפָר', partOfSpeech: 'noun', definitions: ['border, frontier'] },
];

describe('suggestionRequest', () => {
  describe('with homographs', () => {
    const request = suggestionRequest(sefer, seferHomographs);

    test('lists them with their meanings', () => {
      expect(request.user).toBe(
        [
          'Word: ספר',
          'With niqqud: סֵפֶר',
          'Part of speech: noun',
          'Meanings:',
          '- book',
          '- (archaic) a writing',
          'Without niqqud, its spelling could also be:',
          '- סַפָּר (noun): barber',
          '- סָפַר (verb): to count',
          '- סְפָר (noun): border, frontier',
        ].join('\n'),
      );
    });

    test('gives the editor’s help for each field', () => {
      expect(request.system).toContain(FIELD_HELP.examples.noun);
      expect(request.system).toContain(FIELD_HELP.productionContext.noun);
      expect(request.system).toContain(FIELD_HELP.readingContext.noun);
    });

    test('asks for a reading context', () => {
      expect(request.schema.safeParse({ examples: [], productionContext: null }).success).toBe(
        false,
      );
    });
  });

  describe('without homographs', () => {
    const request = suggestionRequest({ ...sefer, pointed: '' }, []);

    test('neither lists any nor asks for a reading context', () => {
      expect(request.user).toBe(
        ['Word: ספר', 'Part of speech: noun', 'Meanings:', '- book', '- (archaic) a writing'].join(
          '\n',
        ),
      );
      expect(request.system).not.toContain('Reading context');
      expect(request.schema.parse({ examples: [], productionContext: null })).toEqual({
        examples: [],
        productionContext: null,
      });
    });
  });

  test('gives the help for the part of speech', () => {
    const { system } = suggestionRequest({ ...sefer, partOfSpeech: 'verb' }, []);
    expect(system).toContain(FIELD_HELP.examples.verb);
    expect(system).toContain(FIELD_HELP.productionContext.verb);
  });

  describe('with forms', () => {
    test('lists each after the meanings, with its label where it has one', () => {
      const { user } = suggestionRequest(
        {
          ...sefer,
          pointed: '',
          partOfSpeech: 'other',
          forms: [
            { label: 'f', form: 'שְׁתַּיִם' },
            { label: '', form: 'שְׁנֵי' },
          ],
        },
        [],
      );
      expect(user).toBe(
        [
          'Word: ספר',
          'Part of speech: other',
          'Meanings:',
          '- book',
          '- (archaic) a writing',
          'Forms:',
          '- f: שְׁתַּיִם',
          '- שְׁנֵי',
        ].join('\n'),
      );
    });
  });

  describe('for the examples', () => {
    test('asks for one sentence per distinct meaning, and at most four', () => {
      const { system } = suggestionRequest(sefer, []);
      expect(system).toContain('Write one for each distinct meaning, in their order');
      expect(system).toContain('Meanings that are shades of one sense share a sentence');
      expect(system).toContain('With only one meaning left, write two. Never write more than 4.');
    });

    test('asks for full sentences, punctuated in both languages', () => {
      const { system } = suggestionRequest(sefer, []);
      expect(system).toContain('full sentences a native speaker would say');
      expect(system).toContain('End every sentence with `.`, `?` or `!`, in Hebrew and in English');
    });

    test('pitches everything but the word at the learner’s level', () => {
      const { system } = suggestionRequest(sefer, []);
      expect(system).toContain('The learner’s Hebrew is around A1');
      expect(system).toContain('one short clause of about three to six words');
      expect(system).toContain('Let the word do the work, not a place or object beside it');
    });

    test.each([
      ['noun', 'listed or the plural, or ה, ב, ל, מ or ו before it.'],
      [
        'verb',
        'listed or another person or tense, or the infinitive after a verb like רוצה or צריך.',
      ],
      ['adjective', 'listed or agreeing with a feminine or a plural noun.'],
      ['preposition', 'listed or with a pronoun ending.'],
      ['adverb', 'Its form never changes, so make each sentence a different kind'],
      ['phrase', 'Its form never changes, so make each sentence a different kind'],
      ['other', 'whichever fits a simple sentence, from the forms listed.'],
    ] as const)('says how a %s varies', (partOfSpeech, line) => {
      expect(suggestionRequest({ ...sefer, partOfSpeech }, []).system).toContain(line);
    });

    test('asks for a new form in each further sentence, not every form', () => {
      const { system } = suggestionRequest(sefer, []);
      expect(system).toContain('You needn’t show every form. Just don’t repeat one');
    });
  });
});

describe('toSuggestions', () => {
  const kept = {
    examples: [{ hebrew: 'קראתי ספר', english: 'I read a book' }],
    productionContext: 'a thing you read',
    readingContext: 'ספר טוב',
  };

  test('keeps each example, trimmed', () => {
    expect(
      toSuggestions({
        ...kept,
        examples: [...kept.examples, { hebrew: ' ספר בישול ', english: 'cookbook ' }],
      }),
    ).toEqual({
      examples: [
        { hebrew: 'קראתי ספר', english: 'I read a book' },
        { hebrew: 'ספר בישול', english: 'cookbook' },
      ],
      productionContext: 'a thing you read',
      readingContext: 'ספר טוב',
    });
  });

  test('keeps no more than four examples, counting those that pass the guards', () => {
    const books = ['ספר אחד', 'שני ספרים', 'שלושה ספרים', 'ארבעה ספרים', 'חמישה ספרים'].map(
      (hebrew) => ({ hebrew, english: 'books' }),
    );
    const dropped = { hebrew: 'קראתי <b>ספר</b>', english: 'I read a book' };
    expect(toSuggestions({ ...kept, examples: [dropped, ...books] }).examples).toEqual(
      books.slice(0, 4),
    );
  });

  test('leaves out what Claude answered null or nothing for', () => {
    expect(toSuggestions({ examples: [], productionContext: null })).toEqual({});
    expect(toSuggestions({ ...kept, productionContext: null, readingContext: null })).toEqual({
      examples: kept.examples,
    });
  });

  describe('for an example', () => {
    test.each([
      ['markup in the Hebrew', { hebrew: 'קראתי <b>ספר</b>', english: 'I read a book' }],
      ['an ampersand in the English', { hebrew: 'ספר ומחברת', english: 'a book & a notebook' }],
      ['a line break', { hebrew: 'קראתי\nספר', english: 'I read a book' }],
      ['niqqud', { hebrew: 'קָרָאתִי סֵפֶר', english: 'I read a book' }],
      ['English in the Hebrew', { hebrew: 'קראתי book', english: 'I read a book' }],
      ['Hebrew in the English', { hebrew: 'קראתי ספר', english: 'I read a ספר' }],
      ['parentheses in the English', { hebrew: 'קראתי ספר', english: 'I read (a) book' }],
      ['a blank side', { hebrew: 'קראתי ספר', english: ' ' }],
    ])('drops one with %s, keeping the rest', (_, example) => {
      expect(toSuggestions({ ...kept, examples: [example, ...kept.examples] }).examples).toEqual(
        kept.examples,
      );
    });
  });

  describe('for the production context', () => {
    test.each([
      ['Hebrew, which gives the answer away', 'not ספרון'],
      ['markup', 'a <i>book</i>'],
      ['a line break', 'a thing\nyou read'],
      ['nothing but space', ' '],
    ])('drops one with %s', (_, productionContext) => {
      expect(toSuggestions({ ...kept, productionContext })).not.toHaveProperty('productionContext');
    });
  });

  describe('for the reading context', () => {
    test.each([
      ['English, which translates', 'ספר (book)'],
      ['niqqud', 'קָרָאתִי סֵפֶר'],
      ['no Hebrew', '...'],
      ['markup', 'קראתי <b>ספר</b>'],
    ])('drops one with %s', (_, readingContext) => {
      expect(toSuggestions({ ...kept, readingContext })).not.toHaveProperty('readingContext');
    });
  });
});

describe('suggest', () => {
  test('sends the prompt, and answers with what passes the guards', async () => {
    const create = vi.fn<ClaudeMessages['create']>(
      async () => suggestSefer as Anthropic.Beta.BetaMessage,
    );
    expect(await suggest(sefer, seferHomographs, { create })).toEqual({
      examples: [
        { hebrew: 'אני קורא ספר מעניין', english: "I'm reading an interesting book" },
        { hebrew: 'ספר בישול', english: 'cookbook' },
        { hebrew: 'הספרים על המדף', english: 'the books are on the shelf' },
      ],
      readingContext: 'קראתי ספר',
    });
    const { system, user } = suggestionRequest(sefer, seferHomographs);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ system, messages: [{ role: 'user', content: user }] }),
    );
  });
});
