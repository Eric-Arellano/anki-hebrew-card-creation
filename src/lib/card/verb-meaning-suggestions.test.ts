import { describe, expect, test } from 'vitest';
import type { SuggestedVerbMeaning } from '#lib/api/ai.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import type { Meaning } from './meanings.ts';
import {
  proposedVerbMeanings,
  type VerbMeaningChange,
  verbMeaningsAfterUse,
  verbMeaningsBlocker,
  verbMeaningsRequest,
} from './verb-meaning-suggestions.ts';

// As the lookup answers for the fixture dictionary.
const diber: DictionaryCandidate = {
  id: 30,
  title: 'דיבר',
  pointed: 'דִּבֵּר',
  wiktionaryPartOfSpeech: 'verb',
  definitions: ['to speak (say words)'],
  roots: ['ד־ב־ר'],
  partOfSpeech: 'verb',
  verb: {
    binyan: "pi'el",
    infinitives: [{ pointed: 'לְדַבֵּר', unpointed: 'לדבר' }],
    presents: ['מְדַבֵּר'],
    futures: ['יְדַבֵּר'],
    prepositions: ['עם'],
  },
};

const kelev: DictionaryCandidate = {
  id: 1,
  title: 'כלב',
  pointed: 'כֶּלֶב',
  wiktionaryPartOfSpeech: 'noun',
  definitions: ['dog'],
  roots: [],
  partOfSpeech: 'noun',
  noun: { gender: undefined, plurals: [], feminineSingulars: [], femininePlurals: [] },
};

const toTalk: Meaning = { english: 'to talk' };
const toTalkWith: SuggestedVerbMeaning = {
  english: 'to talk with',
  preposition: 'עם',
  fromIndex: 0,
};
const toTalkAbout: SuggestedVerbMeaning = {
  english: 'to talk about',
  preposition: 'על',
  fromIndex: 0,
};
const toSpeak: SuggestedVerbMeaning = { english: 'to speak (a language)', preposition: 'none' };

describe('verbMeaningsRequest', () => {
  test('sends the filled meanings, trimmed, and the picked verb’s definitions and prepositions', () => {
    expect(
      verbMeaningsRequest(
        {
          word: ' לדבר ',
          pointed: 'לְדַבֵּר ',
          meanings: [{ english: ' to talk ', preposition: 'עם' }, { english: ' ' }, toTalk],
        },
        diber,
      ),
    ).toEqual({
      word: 'לדבר',
      pointed: 'לְדַבֵּר',
      meanings: [{ english: 'to talk', preposition: 'עם' }, { english: 'to talk' }],
      dictionaryDefinitions: ['to speak (say words)'],
      dictionaryPrepositions: ['עם'],
    });
  });

  describe('with an entry that isn’t a verb, or none', () => {
    test.each([
      ['a noun', kelev],
      ['none', undefined],
    ])('sends no definitions, for %s', (_, candidate) => {
      const request = verbMeaningsRequest({ word: 'לדבר', pointed: '', meanings: [] }, candidate);
      expect(request.dictionaryDefinitions).toEqual([]);
      expect(request.dictionaryPrepositions).toEqual([]);
    });
  });
});

describe('verbMeaningsBlocker', () => {
  const request = verbMeaningsRequest({ word: 'לדבר', pointed: '', meanings: [toTalk] }, undefined);

  test('needs the verb', () => {
    expect(verbMeaningsBlocker({ ...request, word: '' })).toBe('Type the verb first.');
  });

  test('needs a meaning or the dictionary’s definitions', () => {
    expect(verbMeaningsBlocker({ ...request, meanings: [] })).toBe(
      'Type a meaning, or pick the verb’s dictionary entry, first.',
    );
    expect(
      verbMeaningsBlocker({ ...request, meanings: [], dictionaryDefinitions: ['to speak'] }),
    ).toBeUndefined();
    expect(verbMeaningsBlocker(request)).toBeUndefined();
  });
});

describe('proposedVerbMeanings', () => {
  test.each<[string, Meaning, SuggestedVerbMeaning, VerbMeaningChange]>([
    [
      'the same line, with the same preposition',
      { english: 'to talk', preposition: 'עם' },
      { english: 'to talk', preposition: 'עם', fromIndex: 0 },
      { kind: 'unchanged' },
    ],
    [
      'the line given a preposition',
      toTalk,
      { english: 'to talk', preposition: 'עם', fromIndex: 0 },
      { kind: 'newPreposition' },
    ],
    [
      'the line given another preposition than the one chosen',
      { english: 'to help', preposition: 'את' },
      { english: 'to help', preposition: 'ל', fromIndex: 0 },
      { kind: 'newPreposition', replaced: 'את' },
    ],
    ['the line in other words', toTalk, toTalkWith, { kind: 'reworded', original: 'to talk' }],
    ['a meaning from no line', toTalk, toSpeak, { kind: 'added' }],
  ])('says what it does, for %s', (_, line, suggested, change) => {
    expect(proposedVerbMeanings([line], [suggested])).toEqual([{ ...suggested, change }]);
  });
});

describe('verbMeaningsAfterUse', () => {
  const proposed = proposedVerbMeanings([toTalk], [toTalkWith, toTalkAbout, toSpeak]);

  test('splits the line in its place, then adds the rest', () => {
    expect(verbMeaningsAfterUse([toTalk], proposed, [])).toEqual([
      { english: 'to talk with', preposition: 'עם' },
      { english: 'to talk about', preposition: 'על' },
      { english: 'to speak (a language)', preposition: 'none' },
    ]);
  });

  describe('with some meanings skipped', () => {
    test('leaves them out', () => {
      expect(verbMeaningsAfterUse([toTalk], proposed, [1, 2])).toEqual([
        { english: 'to talk with', preposition: 'עם' },
      ]);
    });
  });

  describe('with every meaning from a line skipped', () => {
    test('keeps the line as it was', () => {
      expect(verbMeaningsAfterUse([toTalk], proposed, [0, 1])).toEqual([
        toTalk,
        { english: 'to speak (a language)', preposition: 'none' },
      ]);
    });
  });

  describe('with a line Claude left out', () => {
    test('keeps it in its place', () => {
      const asked: Meaning[] = [toTalk, { english: 'to speak', preposition: 'none' }];
      const keepsOnlyTheSecond = proposedVerbMeanings(asked, [
        { english: 'to speak', preposition: 'none', fromIndex: 1 },
        toSpeak,
      ]);
      expect(verbMeaningsAfterUse(asked, keepsOnlyTheSecond, [])).toEqual([
        toTalk,
        { english: 'to speak', preposition: 'none' },
        { english: 'to speak (a language)', preposition: 'none' },
      ]);
    });
  });

  describe('with an unchanged meaning skipped', () => {
    test('keeps it, since there is nothing to skip', () => {
      const asked: Meaning[] = [{ english: 'to talk', preposition: 'עם' }];
      const unchanged = proposedVerbMeanings(asked, [
        { english: 'to talk', preposition: 'עם', fromIndex: 0 },
      ]);
      expect(verbMeaningsAfterUse(asked, unchanged, [0])).toEqual(asked);
    });
  });

  describe('with no lines yet', () => {
    test('is the meanings taken', () => {
      const fromNothing = proposedVerbMeanings(
        [],
        [toSpeak, { english: 'to talk', preposition: 'עם' }],
      );
      expect(verbMeaningsAfterUse([], fromNothing, [0])).toEqual([
        { english: 'to talk', preposition: 'עם' },
      ]);
    });
  });
});
