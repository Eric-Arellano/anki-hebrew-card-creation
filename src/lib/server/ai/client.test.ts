import Anthropic, { type APIError } from '@anthropic-ai/sdk';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { claudeMessage, failingClaude, fakeClaude, textBlock } from '#tests/fake-claude.ts';
import { AiError, askForStructured } from './client.ts';

const request = {
  system: 'Answer with the word’s gender.',
  user: 'ספר',
  schema: z.object({ gender: z.enum(['m', 'f']) }),
};

function apiError(status: number, message: string): APIError {
  return Anthropic.APIError.generate(
    status,
    { type: 'error', error: { type: 'error', message } },
    undefined,
    new Headers(),
  );
}

describe('askForStructured', () => {
  describe('when Claude answers', () => {
    test('sends the system prompt and the message, and returns the parsed answer', async () => {
      const messages = fakeClaude(claudeMessage('end_turn', [textBlock('{"gender":"m"}')]));

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

    test('sends the effort a request asks for', async () => {
      const messages = fakeClaude(claudeMessage('end_turn', [textBlock('{"gender":"m"}')]));
      await askForStructured({ ...request, effort: 'medium' }, messages);
      expect(messages.create.mock.calls[0]?.[0].output_config?.effort).toBe('medium');
    });

    test('reads the text block after a thinking block', async () => {
      const thinking = { type: 'thinking', thinking: '', signature: 'sig' } as const;
      const messages = fakeClaude(
        claudeMessage('end_turn', [thinking, textBlock('{"gender":"f"}')]),
      );
      expect(await askForStructured(request, messages)).toEqual({ gender: 'f' });
    });

    test('rejects an answer that fails the schema', async () => {
      const messages = fakeClaude(claudeMessage('end_turn', [textBlock('{"gender":"n"}')]));
      await expect(askForStructured(request, messages)).rejects.toThrow(
        new AiError('Claude sent an answer in the wrong shape.'),
      );
    });

    test('rejects an answer with no text', async () => {
      await expect(
        askForStructured(request, fakeClaude(claudeMessage('end_turn', []))),
      ).rejects.toThrow(new AiError('Claude sent no answer.'));
    });
  });

  describe('when Claude stops early', () => {
    test('rejects a refusal', async () => {
      const messages = fakeClaude(claudeMessage('refusal', [textBlock('{"gen')]));
      await expect(askForStructured(request, messages)).rejects.toThrow(
        new AiError('Claude declined to answer.'),
      );
    });

    test('rejects an answer cut off at max_tokens', async () => {
      const messages = fakeClaude(claudeMessage('max_tokens', [textBlock('{"gen')]));
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
      await expect(askForStructured(request, failingClaude(error))).rejects.toThrow(
        new AiError(message),
      );
    });

    test('lets an error from outside the SDK through', async () => {
      const bug = new TypeError('not a function');
      await expect(askForStructured(request, failingClaude(bug))).rejects.toBe(bug);
    });
  });
});
