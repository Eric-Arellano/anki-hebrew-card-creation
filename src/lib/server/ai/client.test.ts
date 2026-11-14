import Anthropic, { type APIError } from '@anthropic-ai/sdk';
import { afterEach, describe, expect, type Mock, test, vi } from 'vitest';
import { z } from 'zod';
import { AiError, askForStructured, type ClaudeMessages, isAiAvailable } from './client.ts';

const env = vi.hoisted(() => ({ apiKey: undefined as string | undefined }));

vi.mock('$app/env/private', () => ({
  get ANTHROPIC_API_KEY() {
    return env.apiKey;
  },
}));

afterEach(() => {
  env.apiKey = undefined;
});

const request = {
  system: 'Answer with the word’s gender.',
  user: 'ספר',
  schema: z.object({ gender: z.enum(['m', 'f']) }),
};

function replyingWith(
  stopReason: Anthropic.Beta.BetaStopReason,
  content: Anthropic.Beta.BetaContentBlock[],
): { create: Mock<ClaudeMessages['create']> } {
  const message = { stop_reason: stopReason, content } as Anthropic.Beta.BetaMessage;
  return { create: vi.fn<ClaudeMessages['create']>(async () => message) };
}

function failingWith(error: unknown): ClaudeMessages {
  return {
    create: vi.fn(async () => {
      throw error;
    }),
  };
}

function textBlock(text: string): Anthropic.Beta.BetaContentBlock {
  return { type: 'text', text, citations: null };
}

function apiError(status: number, message: string): APIError {
  return Anthropic.APIError.generate(
    status,
    { type: 'error', error: { type: 'error', message } },
    undefined,
    new Headers(),
  );
}

describe('isAiAvailable', () => {
  test('is true with a key', () => {
    env.apiKey = 'test-key';
    expect(isAiAvailable()).toBe(true);
  });

  test('is false without one', () => {
    expect(isAiAvailable()).toBe(false);
  });
});

describe('askForStructured', () => {
  describe('when Claude answers', () => {
    test('sends the system prompt and the message, and returns the parsed answer', async () => {
      const messages = replyingWith('end_turn', [textBlock('{"gender":"m"}')]);

      expect(await askForStructured(request, messages)).toEqual({ gender: 'm' });
      expect(messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-5-5',
          fallbacks: 'default',
          system: 'Answer with the word’s gender.',
          messages: [{ role: 'user', content: 'ספר' }],
          output_config: expect.objectContaining({
            effort: 'low',
            format: expect.objectContaining({ type: 'json_schema' }),
          }),
        }),
      );
    });

    test('reads the text block after a thinking block', async () => {
      const thinking = { type: 'thinking', thinking: '', signature: 'sig' } as const;
      const messages = replyingWith('end_turn', [thinking, textBlock('{"gender":"f"}')]);
      expect(await askForStructured(request, messages)).toEqual({ gender: 'f' });
    });

    test('rejects an answer that fails the schema', async () => {
      const messages = replyingWith('end_turn', [textBlock('{"gender":"n"}')]);
      await expect(askForStructured(request, messages)).rejects.toThrow(
        new AiError('Claude sent an answer in the wrong shape.'),
      );
    });

    test('rejects an answer with no text', async () => {
      await expect(askForStructured(request, replyingWith('end_turn', []))).rejects.toThrow(
        new AiError('Claude sent no answer.'),
      );
    });
  });

  describe('when Claude stops early', () => {
    test('rejects a refusal', async () => {
      const messages = replyingWith('refusal', [textBlock('{"gen')]);
      await expect(askForStructured(request, messages)).rejects.toThrow(
        new AiError('Claude declined to answer.'),
      );
    });

    test('rejects an answer cut off at max_tokens', async () => {
      const messages = replyingWith('max_tokens', [textBlock('{"gen')]);
      await expect(askForStructured(request, messages)).rejects.toThrow(
        new AiError('Claude’s answer was cut off.'),
      );
    });
  });

  describe('when the API fails', () => {
    test.each([
      [
        apiError(401, 'invalid x-api-key'),
        'Anthropic refused the API key. Check ANTHROPIC_API_KEY.',
      ],
      [apiError(429, 'rate_limit_error'), 'Claude is rate limited. Try again in a minute.'],
      [apiError(529, 'Overloaded'), 'Claude is overloaded or down. Try again shortly.'],
      [
        apiError(400, 'Your credit balance is too low to access the Anthropic API.'),
        'Anthropic answered 400: Your credit balance is too low to access the Anthropic API.',
      ],
      [new Anthropic.APIConnectionTimeoutError(), 'Claude took too long to answer.'],
      [
        new Anthropic.APIConnectionError({ message: 'Connection error.' }),
        'Can’t reach api.anthropic.com. Are you online?',
      ],
    ])('rejects %o saying so', async (error, message) => {
      await expect(askForStructured(request, failingWith(error))).rejects.toThrow(
        new AiError(message),
      );
    });

    test('lets an error from outside the SDK through', async () => {
      const bug = new TypeError('not a function');
      await expect(askForStructured(request, failingWith(bug))).rejects.toBe(bug);
    });
  });

  describe('without a key', () => {
    test('rejects saying how to set one', async () => {
      await expect(askForStructured(request)).rejects.toThrow(
        new AiError('Set ANTHROPIC_API_KEY to use Claude.'),
      );
    });
  });
});
