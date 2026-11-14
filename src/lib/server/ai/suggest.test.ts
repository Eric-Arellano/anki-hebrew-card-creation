import type Anthropic from '@anthropic-ai/sdk';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SuggestRequest } from '#lib/api/ai.ts';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import { FIELD_HELP } from '#lib/field-help.ts';
import { lookUp, withDictionary } from '#lib/server/dictionary/lookup.ts';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import suggestSefer from '#tests/fixtures/claude/suggest-sefer.json' with { type: 'json' };
import type { ClaudeMessages } from './client.ts';
import {
  type Homograph,
  homographsOf,
  suggest,
  suggestionRequest,
  toSuggestions,
} from './suggest.ts';

vi.mock('$app/env/private', () => ({ ANTHROPIC_API_KEY: 'test-key' }));

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

function lookupOf(word: string): DictionaryLookup {
  return withDictionary(index, (db, staleIndex) => lookUp(db, word, staleIndex));
}

const sefer: SuggestRequest = {
  word: 'ספר',
  pointed: 'סֵפֶר',
  partOfSpeech: 'noun',
  definitions: ['book', '(archaic) a writing'],
};

const seferHomographs: Homograph[] = [
  { pointed: 'סַפָּר', partOfSpeech: 'noun', definitions: ['barber'] },
  { pointed: 'סָפַר', partOfSpeech: 'verb', definitions: ['to count'] },
  { pointed: 'סְפָר', partOfSpeech: 'noun', definitions: ['border, frontier'] },
];

describe('homographsOf', () => {
  test('lists the entries with the same spelling and other niqqud', () => {
    expect(homographsOf(lookupOf('ספר'), 'ספר', 'סֵפֶר')).toEqual(seferHomographs);
  });

  test('compares the niqqud after NFC', () => {
    // סַפָּר with its dagesh before its qamats, the order NFC reverses.
    const barber = 'ס\u05B7פ\u05BC\u05B8ר';
    expect(homographsOf(lookupOf('ספר'), 'ספר', barber).map(({ pointed }) => pointed)).toEqual([
      'סֵפֶר',
      'סָפַר',
      'סְפָר',
    ]);
  });

  describe('when the lookup reached an entry through its forms', () => {
    test('leaves it out', () => {
      expect(lookupOf('כלב').candidates.map(({ pointed }) => pointed)).toContain('כַּלְבָּה');
      expect(homographsOf(lookupOf('כלב'), 'כלב', 'כֶּלֶב')).toEqual([]);
    });

    test('leaves out a verb’s own entry, found by its infinitive', () => {
      expect(homographsOf(lookupOf('לדבר'), 'לדבר', 'לְדַבֵּר')).toEqual([]);
    });
  });

  describe('without niqqud for the note', () => {
    test('finds none', () => {
      expect(homographsOf(lookupOf('ספר'), 'ספר', ' ')).toEqual([]);
    });
  });

  describe('when the match is only possible', () => {
    test('finds none', () => {
      expect(homographsOf({ ...lookupOf('ספר'), match: 'possible' }, 'ספר', 'סֵפֶר')).toEqual([]);
    });
  });
});

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
});

describe('toSuggestions', () => {
  const kept = {
    examples: [{ hebrew: 'קראתי ספר', english: 'I read a book' }],
    productionContext: 'a thing you read',
    readingContext: 'ספר טוב',
  };

  test('writes each example as the Examples help shows it, one per line', () => {
    expect(
      toSuggestions({
        ...kept,
        examples: [...kept.examples, { hebrew: ' ספר בישול ', english: 'cookbook ' }],
      }),
    ).toEqual({
      examples: 'קראתי ספר (I read a book)\nספר בישול (cookbook)',
      productionContext: 'a thing you read',
      readingContext: 'ספר טוב',
    });
  });

  test('leaves out what Claude answered null or nothing for', () => {
    expect(toSuggestions({ examples: [], productionContext: null })).toEqual({});
    expect(toSuggestions({ ...kept, productionContext: null, readingContext: null })).toEqual({
      examples: 'קראתי ספר (I read a book)',
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
      expect(toSuggestions({ ...kept, examples: [example, ...kept.examples] }).examples).toBe(
        'קראתי ספר (I read a book)',
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
      examples:
        "אני קורא ספר מעניין (I'm reading an interesting book)\n" +
        'ספר בישול (cookbook)\n' +
        'הספרים על המדף (the books are on the shelf)',
      readingContext: 'קראתי ספר',
    });
    const { system, user } = suggestionRequest(sefer, seferHomographs);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ system, messages: [{ role: 'user', content: user }] }),
    );
  });
});
