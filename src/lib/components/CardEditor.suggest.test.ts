// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { Suggestions } from '#lib/api/ai.ts';
import {
  chooseNoun,
  fillInputs,
  input,
  noteField,
  renderConnectedEditor,
  type ServerReplies,
  type ServerRequest,
  typeInto,
} from './CardEditor.harness.ts';

// As `/api/ai/suggest` answers for סֵפֶר, from the captured reply in `tests/fixtures/claude/`.
const seferSuggestions: Suggestions = {
  examples:
    "אני קורא ספר מעניין (I'm reading an interesting book)\n" +
    'ספר בישול (cookbook)\n' +
    'הספרים על המדף (the books are on the shelf)',
  readingContext: 'קראתי ספר',
};

const EXAMPLES = 'Examples';
const PRODUCTION_CONTEXT = 'Hint for recalling the Hebrew from its English meaning';
const READING_CONTEXT = 'Hint for reading the Hebrew without niqqud';

function suggestButton() {
  return screen.getByRole('button', { name: 'Suggest' }) as HTMLButtonElement;
}

function suggestRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/ai/suggest');
}

// The texts a screen reader reads after the field's label.
function description(element: HTMLElement): string[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '');
}

function isMarkedSuggested(fieldName: string): boolean {
  return description(noteField(fieldName)).includes('Suggested');
}

async function renderWithKey(replies: Omit<ServerReplies, 'status' | 'ai'> = {}) {
  return renderConnectedEditor({
    ai: { available: true },
    suggest: () => Response.json(seferSuggestions),
    ...replies,
  });
}

async function fillSefer() {
  await fillInputs({ word: 'ספר', pointed: 'סֵפֶר', gloss: 'book' });
  await chooseNoun('Masculine');
}

async function answered() {
  await waitFor(() => expect(suggestButton().getAttribute('aria-busy')).toBe('false'));
}

async function clickSuggest() {
  await fireEvent.click(suggestButton());
  await answered();
}

// A reply the test sends once it has done what the human does while waiting.
function heldReply() {
  let send: (suggestions: Suggestions) => void = () => {};
  const reply = new Promise<Response>((resolve) => {
    send = (suggestions) => resolve(Response.json(suggestions));
  });
  return { suggest: () => reply, send: (suggestions: Suggestions) => send(suggestions) };
}

describe('CardEditor', () => {
  describe('suggesting', () => {
    test('asks with the word, its niqqud, its part of speech and its meanings', async () => {
      const requests = await renderWithKey();
      await fillSefer();
      await clickSuggest();
      expect(suggestRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/ai/suggest',
          body: { word: 'ספר', pointed: 'סֵפֶר', partOfSpeech: 'noun', definitions: ['book'] },
        },
      ]);
    });

    test('fills the blank fields, and leaves a filled one alone', async () => {
      await renderWithKey();
      await fillSefer();
      await typeInto(noteField(READING_CONTEXT), 'ספר טוב');
      await clickSuggest();
      expect(noteField(EXAMPLES).value).toBe(seferSuggestions.examples);
      expect(noteField(READING_CONTEXT).value).toBe('ספר טוב');
      expect(noteField(PRODUCTION_CONTEXT).value).toBe('');
    });

    test('fills only what is still blank when the reply lands', async () => {
      const { suggest, send } = heldReply();
      await renderWithKey({ suggest });
      await fillSefer();
      await fireEvent.click(suggestButton());
      expect(suggestButton().disabled).toBe(true);
      await typeInto(noteField(EXAMPLES), 'ספר חדש (a new book)');
      send(seferSuggestions);
      await answered();
      expect(noteField(EXAMPLES).value).toBe('ספר חדש (a new book)');
      expect(noteField(READING_CONTEXT).value).toBe('קראתי ספר');
    });

    describe('the Suggested badge', () => {
      test('marks each field Claude filled, until it is edited', async () => {
        await renderWithKey();
        await fillSefer();
        await clickSuggest();
        expect(isMarkedSuggested(EXAMPLES)).toBe(true);
        expect(isMarkedSuggested(READING_CONTEXT)).toBe(true);
        expect(isMarkedSuggested(PRODUCTION_CONTEXT)).toBe(false);

        await typeInto(noteField(EXAMPLES), 'אני קורא ספר מעניין (I’m reading a good book)');
        expect(isMarkedSuggested(EXAMPLES)).toBe(false);
        expect(isMarkedSuggested(READING_CONTEXT)).toBe(true);
      });

      test('comes back if the edit is undone', async () => {
        await renderWithKey();
        await fillSefer();
        await clickSuggest();
        await typeInto(noteField(READING_CONTEXT), 'קראתי');
        await typeInto(noteField(READING_CONTEXT), 'קראתי ספר');
        expect(isMarkedSuggested(READING_CONTEXT)).toBe(true);
      });
    });

    describe('when the word changes while Claude answers', () => {
      test('fills nothing, saying why', async () => {
        const { suggest, send } = heldReply();
        await renderWithKey({ suggest });
        await fillSefer();
        await fireEvent.click(suggestButton());
        await typeInto(input('English meaning'), 'barber');
        send(seferSuggestions);
        await screen.findByText(/changed while Claude was answering/);
        expect(noteField(EXAMPLES).value).toBe('');
      });
    });

    describe('when Claude has nothing for the blank fields', () => {
      test('says so', async () => {
        await renderWithKey({ suggest: () => Response.json({}) });
        await fillSefer();
        await clickSuggest();
        expect(screen.getByText('Claude had nothing to add to the blank fields.')).toBeTruthy();
      });
    });

    describe('when the call fails', () => {
      test('says why, and fills nothing', async () => {
        await renderWithKey({
          suggest: () => Response.json({ message: 'Claude declined to answer.' }, { status: 502 }),
        });
        await fillSefer();
        await clickSuggest();
        expect(screen.getByText(/Couldn't get suggestions/).textContent).toBe(
          "Couldn't get suggestions: Claude declined to answer.",
        );
        expect(noteField(EXAMPLES).value).toBe('');
        expect(suggestButton().disabled).toBe(false);
      });
    });

    describe('before there is a word and a meaning', () => {
      test('is disabled, saying why', async () => {
        await renderWithKey();
        await chooseNoun('Masculine');
        expect(suggestButton().disabled).toBe(true);
        expect(description(suggestButton())).toEqual(['Type the word and a meaning first.']);
      });
    });

    describe('once all three fields are filled', () => {
      test('is disabled, saying why', async () => {
        await renderWithKey();
        await fillSefer();
        await typeInto(noteField(EXAMPLES), 'ספר חדש (a new book)');
        await typeInto(noteField(PRODUCTION_CONTEXT), 'something you read');
        await typeInto(noteField(READING_CONTEXT), 'קראתי ספר');
        expect(suggestButton().disabled).toBe(true);
        expect(description(suggestButton())).toEqual([
          'The examples and both hints are filled. Clear one to have it suggested again.',
        ]);
      });
    });

    describe('without a key', () => {
      test('is not offered', async () => {
        const requests = await renderConnectedEditor();
        await fillSefer();
        expect(requests.some((request) => request.path === '/api/ai/status')).toBe(true);
        expect(screen.queryByRole('button', { name: 'Suggest' })).toBeNull();
        expect(noteField(EXAMPLES)).toBeTruthy();
      });
    });
  });
});
