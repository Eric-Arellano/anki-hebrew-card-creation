import { describe, expect, test } from 'vitest';
import type { Suggestions } from '#lib/api/ai.ts';
import { type CardDraft, emptyCardDraft } from './draft.ts';
import { filledBlanks, isUnreadSuggestion, suggestBlocker, suggestRequest } from './suggestions.ts';

// As `/api/ai/suggest` answers for סֵפֶר, from the captured reply in `tests/fixtures/claude/`.
const seferSuggestions: Suggestions = {
  examples: [
    { hebrew: 'אני קורא ספר מעניין', english: "I'm reading an interesting book" },
    { hebrew: 'ספר בישול', english: 'cookbook' },
    { hebrew: 'הספרים על המדף', english: 'the books are on the shelf' },
  ],
  readingContext: 'קראתי ספר',
};

const newBook = { hebrew: 'ספר חדש.', english: 'A new book.' };
const blankRow = { hebrew: '', english: '' };

function seferDraft(changes: Partial<CardDraft> = {}): CardDraft {
  const empty = emptyCardDraft();
  return {
    ...empty,
    inputs: {
      ...empty.inputs,
      word: 'ספר',
      pointed: 'סֵפֶר',
      definitions: ['book'],
      partOfSpeech: 'noun',
      noun: { ...empty.inputs.noun, gender: 'm' },
    },
    ...changes,
  };
}

describe('suggestBlocker', () => {
  test('asks for the word and a meaning first', () => {
    expect(suggestBlocker(emptyCardDraft())).toBe('Type the word and a meaning first.');
  });

  test('counts a meaning of only spaces as none', () => {
    const draft = seferDraft();
    expect(suggestBlocker({ ...draft, inputs: { ...draft.inputs, definitions: ['  '] } })).toBe(
      'Type the word and a meaning first.',
    );
  });

  test('blocks once the examples and both hints are filled', () => {
    expect(
      suggestBlocker(
        seferDraft({
          examples: [newBook],
          edits: { productionContext: 'something you read', readingContext: 'קראתי ספר' },
        }),
      ),
    ).toBe('The examples and both hints are filled. Clear one to have it suggested again.');
  });

  test('allows asking while any of the three is blank', () => {
    expect(suggestBlocker(seferDraft())).toBeUndefined();
    expect(
      suggestBlocker(seferDraft({ edits: { productionContext: 'a', readingContext: 'ב' } })),
    ).toBeUndefined();
    expect(
      suggestBlocker(seferDraft({ examples: [newBook], edits: { productionContext: 'a' } })),
    ).toBeUndefined();
    expect(
      suggestBlocker(
        seferDraft({ examples: [newBook], edits: { productionContext: 'a', readingContext: ' ' } }),
      ),
    ).toBeUndefined();
  });
});

describe('suggestRequest', () => {
  test('sends the trimmed word, its niqqud, its meanings and its forms', () => {
    const draft = seferDraft();
    expect(
      suggestRequest(
        {
          ...draft,
          inputs: {
            ...draft.inputs,
            word: ' ספר ',
            definitions: ['book', ' ', ' volume '],
            noun: { ...draft.inputs.noun, plural: 'סְפָרִים' },
          },
        },
        'noun',
      ),
    ).toEqual({
      word: 'ספר',
      pointed: 'סֵפֶר',
      partOfSpeech: 'noun',
      definitions: ['book', 'volume'],
      forms: [{ label: 'plural', form: 'סְפָרִים' }],
    });
  });
});

describe('filledBlanks', () => {
  test('fills every blank the reply has', () => {
    expect(filledBlanks(seferSuggestions, {}, [blankRow])).toEqual(seferSuggestions);
  });

  test('leaves a hint the human typed during the call', () => {
    expect(filledBlanks(seferSuggestions, { readingContext: 'ספר טוב' }, [blankRow])).toEqual({
      examples: seferSuggestions.examples,
    });
  });

  test('fills a hint of only spaces', () => {
    expect(filledBlanks(seferSuggestions, { readingContext: '  ' }, [newBook])).toEqual({
      readingContext: 'קראתי ספר',
    });
  });

  test('leaves the examples once any row is typed', () => {
    expect(filledBlanks(seferSuggestions, {}, [blankRow, newBook])).toEqual({
      readingContext: 'קראתי ספר',
    });
  });

  test('fills nothing from an empty reply', () => {
    expect(filledBlanks({}, {}, [blankRow])).toEqual({});
  });
});

describe('isUnreadSuggestion', () => {
  describe('the examples', () => {
    test('are unread while they are as Claude wrote them', () => {
      expect(
        isUnreadSuggestion('examples', seferSuggestions, {}, [
          ...(seferSuggestions.examples ?? []),
        ]),
      ).toBe(true);
    });

    test('are read once a row is edited', () => {
      expect(isUnreadSuggestion('examples', seferSuggestions, {}, [newBook])).toBe(false);
    });

    test('are not a suggestion when Claude wrote none', () => {
      expect(isUnreadSuggestion('examples', {}, {}, [blankRow])).toBe(false);
    });
  });

  describe('a hint', () => {
    test('is unread while it is as Claude wrote it', () => {
      expect(
        isUnreadSuggestion('readingContext', seferSuggestions, { readingContext: 'קראתי ספר' }, []),
      ).toBe(true);
    });

    test('is read once edited', () => {
      expect(
        isUnreadSuggestion('readingContext', seferSuggestions, { readingContext: 'קראתי' }, []),
      ).toBe(false);
    });

    test('is not a suggestion when Claude wrote none', () => {
      expect(isUnreadSuggestion('productionContext', seferSuggestions, {}, [])).toBe(false);
    });
  });

  test('is never true of a field Claude does not suggest', () => {
    expect(isUnreadSuggestion('forms', seferSuggestions, { forms: 'קראתי ספר' }, [])).toBe(false);
  });
});
