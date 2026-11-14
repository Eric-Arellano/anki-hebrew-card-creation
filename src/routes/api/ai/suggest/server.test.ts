import type Anthropic from '@anthropic-ai/sdk';
import { isHttpError } from '@sveltejs/kit';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import suggestSefer from '#tests/fixtures/claude/suggest-sefer.json' with { type: 'json' };
import { _suggest } from './+server.ts';

const env = vi.hoisted(() => ({ apiKey: 'test-key' as string | undefined }));

vi.mock('$app/env/private', () => ({
  get ANTHROPIC_API_KEY() {
    return env.apiKey;
  },
}));

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

afterEach(() => {
  env.apiKey = 'test-key';
});

const sefer = {
  word: 'ספר',
  pointed: 'סֵפֶר',
  partOfSpeech: 'noun',
  definitions: ['book', '(archaic) a writing'],
};

function suggestRequest(body: unknown) {
  return new Request('http://127.0.0.1:5173/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function replyingWith(message: unknown) {
  return {
    create: vi.fn<ClaudeMessages['create']>(async () => message as Anthropic.Beta.BetaMessage),
  };
}

describe('_suggest', () => {
  test('answers with Claude’s suggestions, asking with the homographs', async () => {
    const messages = replyingWith(suggestSefer);
    const response = await _suggest(index, suggestRequest(sefer), messages);
    expect(await response.json()).toEqual({
      examples:
        "אני קורא ספר מעניין (I'm reading an interesting book)\n" +
        'ספר בישול (cookbook)\n' +
        'הספרים על המדף (the books are on the shelf)',
      readingContext: 'קראתי ספר',
    });
    expect(messages.create.mock.calls[0]?.[0].messages).toEqual([
      { role: 'user', content: expect.stringContaining('- סַפָּר (noun): barber') },
    ]);
  });

  test('trims the word and drops blank meanings before asking', async () => {
    const messages = replyingWith(suggestSefer);
    await _suggest(
      index,
      suggestRequest({ ...sefer, word: ' ספר ', definitions: ['book', ' '] }),
      messages,
    );
    expect(messages.create.mock.calls[0]?.[0].messages[0]?.content).toMatch(
      /^Word: ספר\n.*\nMeanings:\n- book\nWithout/s,
    );
  });

  describe('when the request is incomplete', () => {
    test.each([
      ['a blank word', { ...sefer, word: ' ' }],
      ['no meaning', { ...sefer, definitions: [' '] }],
    ])('answers 400 for %s without asking Claude', async (_, body) => {
      const messages = replyingWith(suggestSefer);
      await expect(_suggest(index, suggestRequest(body), messages)).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 400) && error.body.message === 'Type the word and a meaning first.',
      );
      expect(messages.create).not.toHaveBeenCalled();
    });

    test('answers 400 for an unknown part of speech', async () => {
      await expect(
        _suggest(index, suggestRequest({ ...sefer, partOfSpeech: 'pronoun' })),
      ).rejects.toSatisfy((error) => isHttpError(error, 400));
    });
  });

  describe('without a key', () => {
    test('answers 503 saying how to set one', async () => {
      env.apiKey = undefined;
      await expect(_suggest(index, suggestRequest(sefer))).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 503) && error.body.message === 'Set ANTHROPIC_API_KEY to use Claude.',
      );
    });
  });

  describe('without an index', () => {
    test('answers 503 with how to build one', async () => {
      const messages = replyingWith(suggestSefer);
      await expect(
        _suggest({ ...index, index: `${index.index}.missing` }, suggestRequest(sefer), messages),
      ).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 503) &&
          error.body.message === "There's no dictionary index yet. Run npm run build-index.",
      );
      expect(messages.create).not.toHaveBeenCalled();
    });
  });

  describe('when Claude fails', () => {
    test('answers 502 with the reason', async () => {
      const messages = replyingWith({ ...suggestSefer, stop_reason: 'refusal' });
      await expect(_suggest(index, suggestRequest(sefer), messages)).rejects.toSatisfy(
        (error) => isHttpError(error, 502) && error.body.message === 'Claude declined to answer.',
      );
    });
  });
});
