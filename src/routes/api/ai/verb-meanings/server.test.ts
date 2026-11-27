import { isHttpError } from '@sveltejs/kit';
import { describe, expect, test } from 'vitest';
import { fakeClaude } from '#tests/fake-claude.ts';
import verbMeaningsLishmor from '#tests/fixtures/claude/verb-meanings-lishmor.json' with {
  type: 'json',
};
import { _suggestVerbMeanings } from './+server.ts';

const lishmor = {
  word: 'לשמור',
  pointed: 'לִשְׁמֹר',
  meanings: [{ english: 'to keep, guard' }],
  dictionaryDefinitions: ['to guard', '(by extension) to keep', '(computing) to save'],
  dictionaryPrepositions: [],
};

function verbMeaningsPost(body: unknown) {
  return new Request('http://127.0.0.1:5173/api/ai/verb-meanings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function isBadRequest(message?: string) {
  return (error: unknown) =>
    isHttpError(error, 400) && (message === undefined || error.body.message === message);
}

describe('_suggestVerbMeanings', () => {
  test('answers with Claude’s meanings', async () => {
    const response = await _suggestVerbMeanings(
      verbMeaningsPost(lishmor),
      fakeClaude(verbMeaningsLishmor),
    );
    expect(await response.json()).toEqual({
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

  test('trims the verb and each meaning before asking', async () => {
    const messages = fakeClaude(verbMeaningsLishmor);
    await _suggestVerbMeanings(
      verbMeaningsPost({
        ...lishmor,
        word: ' לשמור ',
        meanings: [{ english: ' to keep ', preposition: 'את' }],
      }),
      messages,
    );
    expect(messages.create.mock.calls[0]?.[0].messages[0]?.content).toMatch(
      /^Verb: לשמור\n.*\n1\. to keep \[את\]$/s,
    );
  });

  describe('with no lines, but the dictionary’s definitions', () => {
    test('asks', async () => {
      const messages = fakeClaude(verbMeaningsLishmor);
      await _suggestVerbMeanings(verbMeaningsPost({ ...lishmor, meanings: [] }), messages);
      expect(messages.create).toHaveBeenCalledOnce();
    });
  });

  describe('when the request is incomplete', () => {
    test.each([
      ['a blank verb', { ...lishmor, word: ' ' }, 'Type the verb first.'],
      [
        'neither a meaning nor a definition',
        { ...lishmor, meanings: [], dictionaryDefinitions: [] },
        'Type a meaning, or pick the verb’s dictionary entry, first.',
      ],
    ])('answers 400 for %s without asking Claude', async (_, body, message) => {
      const messages = fakeClaude(verbMeaningsLishmor);
      await expect(_suggestVerbMeanings(verbMeaningsPost(body), messages)).rejects.toSatisfy(
        isBadRequest(message),
      );
      expect(messages.create).not.toHaveBeenCalled();
    });

    test.each([
      ['a blank meaning', { ...lishmor, meanings: [{ english: ' ' }] }],
      [
        'an unknown preposition',
        { ...lishmor, meanings: [{ english: 'to go', preposition: 'אל' }] },
      ],
      ['an unknown dictionary preposition', { ...lishmor, dictionaryPrepositions: ['אל'] }],
    ])('answers 400 for %s', async (_, body) => {
      await expect(
        _suggestVerbMeanings(verbMeaningsPost(body), fakeClaude(verbMeaningsLishmor)),
      ).rejects.toSatisfy(isBadRequest());
    });
  });

  describe('when Claude fails', () => {
    test('answers 502 with the reason', async () => {
      const messages = fakeClaude({ ...verbMeaningsLishmor, stop_reason: 'refusal' });
      await expect(_suggestVerbMeanings(verbMeaningsPost(lishmor), messages)).rejects.toSatisfy(
        (error) => isHttpError(error, 502) && error.body.message === 'Claude declined to answer.',
      );
    });
  });
});
