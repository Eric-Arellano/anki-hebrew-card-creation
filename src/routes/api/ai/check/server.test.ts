import type Anthropic from '@anthropic-ai/sdk';
import { isHttpError } from '@sveltejs/kit';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { fromAnkiFields } from '#lib/note-type.ts';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import { claudeMessage, fakeClaude, textBlock } from '#tests/fake-claude.ts';
import { realNote } from '#tests/real-notes.ts';
import { _check } from './+server.ts';

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

const kelev = { partOfSpeech: 'noun', fields: fromAnkiFields(realNote('כלב')) };

// סֵפֶר, whose spelling the fixture dictionary also has as סַפָּר, סָפַר and סְפָר.
const sefer = {
  partOfSpeech: 'noun',
  fields: { unpointed: 'ספר', pointed: 'סֵפֶר', definitions: 'book', readingContext: 'ספר טוב' },
};

function checkRequest(body: unknown) {
  return new Request('http://127.0.0.1:5173/api/ai/check', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function replyingWith(stopReason: Anthropic.Beta.BetaStopReason, findings: unknown[] = []) {
  return fakeClaude(claudeMessage(stopReason, [textBlock(JSON.stringify({ findings }))]));
}

describe('_check', () => {
  test('answers with Claude’s findings, asking with the homographs', async () => {
    const messages = replyingWith('end_turn', [
      {
        field: 'Reading context',
        problem: 'ספר טוב reads as well as “a good barber”.',
        rewrite: 'קראתי ספר',
      },
    ]);
    const response = await _check(index, checkRequest(sefer), messages);
    expect(await response.json()).toEqual({
      findings: [
        {
          field: 'readingContext',
          problem: 'ספר טוב reads as well as “a good barber”.',
          rewrite: 'קראתי ספר',
        },
      ],
    });
    expect(messages.create.mock.calls[0]?.[0].messages).toEqual([
      {
        role: 'user',
        content: expect.stringContaining(
          'Reading context: ספר טוב\nWithout niqqud, its spelling could also be:\n' +
            '- סַפָּר (noun): barber',
        ),
      },
    ]);
  });

  test('sends none of the note’s media', async () => {
    const messages = replyingWith('end_turn');
    await _check(index, checkRequest(kelev), messages);
    const content = String(messages.create.mock.calls[0]?.[0].messages[0]?.content);
    expect(content).not.toMatch(/\.jpg|\.mp3|sound:|<img/);
    expect(content).toContain('Variant 1 prompt: female dog\n');
  });

  describe('when the note has no word', () => {
    test('answers 400 without asking Claude', async () => {
      const messages = replyingWith('end_turn');
      await expect(
        _check(index, checkRequest({ ...sefer, fields: { definitions: 'book' } }), messages),
      ).rejects.toSatisfy(
        (error) => isHttpError(error, 400) && error.body.message === 'Type the word first.',
      );
      expect(messages.create).not.toHaveBeenCalled();
    });
  });

  test('answers 400 for an unknown part of speech', async () => {
    await expect(
      _check(index, checkRequest({ ...sefer, partOfSpeech: 'pronoun' })),
    ).rejects.toSatisfy((error) => isHttpError(error, 400));
  });

  describe('without an index', () => {
    test('answers 503 without asking Claude', async () => {
      const messages = replyingWith('end_turn');
      await expect(
        _check({ ...index, index: `${index.index}.missing` }, checkRequest(sefer), messages),
      ).rejects.toSatisfy((error) => isHttpError(error, 503));
      expect(messages.create).not.toHaveBeenCalled();
    });
  });

  describe('when Claude fails', () => {
    test('answers 502 with the reason', async () => {
      await expect(_check(index, checkRequest(sefer), replyingWith('refusal'))).rejects.toSatisfy(
        (error) => isHttpError(error, 502) && error.body.message === 'Claude declined to answer.',
      );
    });
  });
});
