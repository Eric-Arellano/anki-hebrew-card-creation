import { describe, expect, test } from 'vitest';
import { senseKeys, sharedSenses } from './meanings.ts';

// The meanings are as notes in the deck write them.
describe('senseKeys', () => {
  describe('for a meaning listing alternatives', () => {
    test('splits it at a comma, slash or semicolon', () => {
      expect(senseKeys(['beautiful, pleasant, pretty'])).toEqual([
        'beautiful',
        'pleasant',
        'pretty',
      ]);
      expect(senseKeys(['to speak / to talk'])).toEqual(['to speak', 'to talk']);
      expect(senseKeys(['to read; to call'])).toEqual(['to read', 'to call']);
    });
  });

  describe('for a meaning with more than the sense', () => {
    test('leaves out what is in parentheses', () => {
      expect(senseKeys(['car (formal register)'])).toEqual(['car']);
      expect(senseKeys(['husband (not as common as בַּעַל)'])).toEqual(['husband']);
    });

    test('leaves out quotes and a closing stop', () => {
      expect(senseKeys(['"here is" / "here are"'])).toEqual(['here is', 'here are']);
      expect(senseKeys(['"Nice to meet you."'])).toEqual(['nice to meet you']);
    });

    test('leaves out a part of speech before a colon', () => {
      expect(senseKeys(['interjection: correct', 'adjective:'])).toEqual(['correct']);
    });

    test('leaves out an article, but not the `to` of a verb', () => {
      expect(senseKeys(['a dog', 'the house', 'to go'])).toEqual(['dog', 'house', 'to go']);
    });
  });

  describe('for meanings repeating a sense', () => {
    test('lists it once, in lowercase', () => {
      expect(senseKeys(['Student', 'student'])).toEqual(['student']);
    });
  });

  describe('for blank meanings', () => {
    test('lists nothing', () => {
      expect(senseKeys(['', ' ', '()'])).toEqual([]);
    });
  });
});

describe('sharedSenses', () => {
  test('lists the senses both list, as the first writes them', () => {
    expect(sharedSenses(['Car', 'vehicle'], ['car (informal register)'])).toEqual(['Car']);
  });

  test('compares whole senses, not words', () => {
    expect(sharedSenses(['to go'], ['to walk, go', 'to go away, depart'])).toEqual([]);
    expect(sharedSenses(['car park'], ['car (formal register)'])).toEqual([]);
  });

  test('lists a sense once, however many times it is shared', () => {
    expect(sharedSenses(['man', 'Man'], ['man', 'husband'])).toEqual(['man']);
  });
});
