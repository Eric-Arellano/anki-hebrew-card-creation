import { describe, expect, test } from 'vitest';
import type { SuggestedMeaning } from '#lib/api/ai.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import type { Meaning } from './definitions.ts';
import {
  meaningsBlocker,
  meaningsRequest,
  proposedMeanings,
  withProposal,
} from './meaning-suggestions.ts';

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
const toTalkWith: SuggestedMeaning = { english: 'to talk with', preposition: 'עם', from: 0 };
const toTalkAbout: SuggestedMeaning = { english: 'to talk about', preposition: 'על', from: 0 };
const toSpeak: SuggestedMeaning = { english: 'to speak (a language)', preposition: 'none' };

describe('meaningsRequest', () => {
  test('sends the filled meanings, trimmed, and the picked verb’s definitions and prepositions', () => {
    expect(
      meaningsRequest(
        {
          word: ' לדבר ',
          pointed: 'לְדַבֵּר ',
          definitions: [{ english: ' to talk ', preposition: 'עם' }, { english: ' ' }, toTalk],
        },
        diber,
      ),
    ).toEqual({
      word: 'לדבר',
      pointed: 'לְדַבֵּר',
      meanings: [{ english: 'to talk', preposition: 'עם' }, { english: 'to talk' }],
      glosses: ['to speak (say words)'],
      prepositions: ['עם'],
    });
  });

  describe('with an entry that isn’t a verb, or none', () => {
    test.each([
      ['a noun', kelev],
      ['none', undefined],
    ])('sends no definitions, for %s', (_, candidate) => {
      const request = meaningsRequest({ word: 'לדבר', pointed: '', definitions: [] }, candidate);
      expect(request.glosses).toEqual([]);
      expect(request.prepositions).toEqual([]);
    });
  });
});

describe('meaningsBlocker', () => {
  const request = meaningsRequest({ word: 'לדבר', pointed: '', definitions: [toTalk] }, undefined);

  test('needs the verb', () => {
    expect(meaningsBlocker({ ...request, word: '' })).toBe('Type the verb first.');
  });

  test('needs a meaning or the dictionary’s definitions', () => {
    expect(meaningsBlocker({ ...request, meanings: [] })).toBe(
      'Type a meaning, or pick the verb’s dictionary entry, first.',
    );
    expect(meaningsBlocker({ ...request, meanings: [], glosses: ['to speak'] })).toBeUndefined();
    expect(meaningsBlocker(request)).toBeUndefined();
  });
});

describe('proposedMeanings', () => {
  test.each<[string, Meaning, SuggestedMeaning, unknown]>([
    [
      'the same line, with the same preposition',
      { english: 'to talk', preposition: 'עם' },
      { english: 'to talk', preposition: 'עם', from: 0 },
      { kind: 'unchanged' },
    ],
    [
      'the line given a preposition',
      toTalk,
      { english: 'to talk', preposition: 'עם', from: 0 },
      { kind: 'yours' },
    ],
    [
      'the line given another preposition than the one chosen',
      { english: 'to help', preposition: 'את' },
      { english: 'to help', preposition: 'ל', from: 0 },
      { kind: 'yours', chose: 'את' },
    ],
    ['the line in other words', toTalk, toTalkWith, { kind: 'reworded', from: 'to talk' }],
    ['a meaning from no line', toTalk, toSpeak, { kind: 'added' }],
  ])('says what it does, for %s', (_, line, suggested, origin) => {
    expect(proposedMeanings([line], [suggested])).toEqual([{ ...suggested, origin }]);
  });
});

describe('withProposal', () => {
  const proposed = proposedMeanings([toTalk], [toTalkWith, toTalkAbout, toSpeak]);

  test('splits the line in its place, then adds the rest', () => {
    expect(withProposal([toTalk], proposed, [])).toEqual([
      { english: 'to talk with', preposition: 'עם' },
      { english: 'to talk about', preposition: 'על' },
      { english: 'to speak (a language)', preposition: 'none' },
    ]);
  });

  describe('with some meanings skipped', () => {
    test('leaves them out', () => {
      expect(withProposal([toTalk], proposed, [1, 2])).toEqual([
        { english: 'to talk with', preposition: 'עם' },
      ]);
    });
  });

  describe('with every meaning from a line skipped', () => {
    test('keeps the line as it was', () => {
      expect(withProposal([toTalk], proposed, [0, 1])).toEqual([
        toTalk,
        { english: 'to speak (a language)', preposition: 'none' },
      ]);
    });
  });

  describe('with a line Claude left out', () => {
    test('keeps it in its place', () => {
      const asked: Meaning[] = [toTalk, { english: 'to speak', preposition: 'none' }];
      const keepsOnlyTheSecond = proposedMeanings(asked, [
        { english: 'to speak', preposition: 'none', from: 1 },
        toSpeak,
      ]);
      expect(withProposal(asked, keepsOnlyTheSecond, [])).toEqual([
        toTalk,
        { english: 'to speak', preposition: 'none' },
        { english: 'to speak (a language)', preposition: 'none' },
      ]);
    });
  });

  describe('with an unchanged meaning skipped', () => {
    test('keeps it, since there is nothing to skip', () => {
      const asked: Meaning[] = [{ english: 'to talk', preposition: 'עם' }];
      const unchanged = proposedMeanings(asked, [{ ...asked[0], from: 0 } as SuggestedMeaning]);
      expect(withProposal(asked, unchanged, [0])).toEqual(asked);
    });
  });

  describe('with no lines yet', () => {
    test('is the meanings taken', () => {
      const fromNothing = proposedMeanings(
        [],
        [toSpeak, { english: 'to talk', preposition: 'עם' }],
      );
      expect(withProposal([], fromNothing, [0])).toEqual([
        { english: 'to talk', preposition: 'עם' },
      ]);
    });
  });
});
