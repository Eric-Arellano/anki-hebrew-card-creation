import { isHttpError } from '@sveltejs/kit';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildFixtureIndex } from '#tests/dictionary-index.ts';
import { fakeClaude } from '#tests/fake-claude.ts';
import suggestSefer from '#tests/fixtures/claude/suggest-sefer.json' with { type: 'json' };
import { _suggest } from './+server.ts';

let index: Awaited<ReturnType<typeof buildFixtureIndex>>;

beforeAll(async () => {
  index = await buildFixtureIndex();
});

afterAll(() => index.remove());

const sefer = {
  word: 'ספר',
  pointed: 'סֵפֶר',
  partOfSpeech: 'noun',
  definitions: [{ english: 'book' }, { english: '(archaic) a writing' }],
  forms: [{ label: 'plural', form: 'סְפָרִים' }],
};

function suggestRequest(body: unknown) {
  return new Request('http://127.0.0.1:5173/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('_suggest', () => {
  test('answers with Claude’s suggestions, asking with the homographs', async () => {
    const messages = fakeClaude(suggestSefer);
    const response = await _suggest(index, suggestRequest(sefer), messages);
    expect(await response.json()).toEqual({
      examples: [
        { hebrew: 'אני קורא ספר מעניין', english: "I'm reading an interesting book" },
        { hebrew: 'ספר בישול', english: 'cookbook' },
        { hebrew: 'הספרים על המדף', english: 'the books are on the shelf' },
      ],
      readingContext: 'קראתי ספר',
    });
    expect(messages.create.mock.calls[0]?.[0].messages).toEqual([
      {
        role: 'user',
        content: expect.stringContaining(
          'Forms:\n- plural: סְפָרִים\nWithout niqqud, its spelling could also be:\n' +
            '- סַפָּר (noun): barber',
        ),
      },
    ]);
  });

  test('trims the word and drops blank meanings before asking', async () => {
    const messages = fakeClaude(suggestSefer);
    await _suggest(
      index,
      suggestRequest({
        ...sefer,
        word: ' ספר ',
        definitions: [{ english: 'book' }, { english: ' ' }],
      }),
      messages,
    );
    expect(messages.create.mock.calls[0]?.[0].messages[0]?.content).toMatch(
      /^Word: ספר\n.*\nMeanings:\n- book\nForms:/s,
    );
  });

  describe('when the request is incomplete', () => {
    test.each([
      ['a blank word', { ...sefer, word: ' ' }],
      ['no meaning', { ...sefer, definitions: [{ english: ' ' }] }],
    ])('answers 400 for %s without asking Claude', async (_, body) => {
      const messages = fakeClaude(suggestSefer);
      await expect(_suggest(index, suggestRequest(body), messages)).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 400) && error.body.message === 'Type the word and a meaning first.',
      );
      expect(messages.create).not.toHaveBeenCalled();
    });

    test('answers 400 for a verb with a meaning whose preposition is unchosen', async () => {
      const messages = fakeClaude(suggestSefer);
      const verb = {
        ...sefer,
        partOfSpeech: 'verb',
        definitions: [{ english: 'to keep', preposition: 'את' }, { english: 'to guard' }],
      };
      await expect(_suggest(index, suggestRequest(verb), messages)).rejects.toSatisfy(
        (error) =>
          isHttpError(error, 400) &&
          error.body.message === 'Choose a preposition for each meaning first.',
      );
      expect(messages.create).not.toHaveBeenCalled();
    });

    test('answers 400 for an unknown part of speech', async () => {
      await expect(
        _suggest(index, suggestRequest({ ...sefer, partOfSpeech: 'pronoun' })),
      ).rejects.toSatisfy((error) => isHttpError(error, 400));
    });
  });

  describe('without an index', () => {
    test('answers 503 with how to build one', async () => {
      const messages = fakeClaude(suggestSefer);
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
      const messages = fakeClaude({ ...suggestSefer, stop_reason: 'refusal' });
      await expect(_suggest(index, suggestRequest(sefer), messages)).rejects.toSatisfy(
        (error) => isHttpError(error, 502) && error.body.message === 'Claude declined to answer.',
      );
    });
  });
});
