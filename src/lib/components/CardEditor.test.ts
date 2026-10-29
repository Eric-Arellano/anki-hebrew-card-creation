// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { CardInputs } from '#lib/compose.ts';
import type { AnkiStatus, ExistingNotes } from '#lib/server/deck.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import CardEditor from './CardEditor.svelte';

const connectedStatus: AnkiStatus = {
  kind: 'connected',
  ankiConnectVersion: 6,
  deckFound: true,
  noteType: {
    found: true,
    liveFieldNames: fieldNames,
    drift: { missingFromAnki: [], unexpectedInAnki: [] },
  },
};

type ServerRequest = { method: string; path: string; body: unknown };

/** Our server, answering the editor's API calls, and recording every request. */
function stubServer(
  status: AnkiStatus = connectedStatus,
  existing: ExistingNotes = { exactMatches: [], relatedMatches: [] },
) {
  const requests: ServerRequest[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method: init?.method ?? 'GET', path: input, body });
    if (input === '/api/anki/status') return Response.json(status);
    if (input.startsWith('/api/anki/existing')) {
      return Response.json(existing);
    }
    if (input === '/api/anki/add') return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  });
  return requests;
}

function addRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/anki/add');
}

async function renderConnectedEditor(existing?: ExistingNotes) {
  const requests = stubServer(connectedStatus, existing);
  render(CardEditor);
  await screen.findByText(/Connected to Anki/);
  return requests;
}

function input(label: string) {
  return within(screen.getByRole('region', { name: 'Word' })).getByLabelText(label);
}

function noteField(fieldName: string) {
  return within(screen.getByRole('region', { name: 'Card' })).getByLabelText(
    fieldName,
  ) as HTMLTextAreaElement;
}

async function typeInto(element: HTMLElement, value: string) {
  await fireEvent.input(element, { target: { value } });
}

async function choosePartOfSpeech(label: string) {
  await fireEvent.click(screen.getByRole('radio', { name: label }));
}

async function fillInputs({ word, pointed, gloss }: Omit<CardInputs, 'partOfSpeech'>) {
  await typeInto(input('Hebrew word, without niqqud'), word);
  await typeInto(input('Hebrew word, with niqqud'), pointed);
  await typeInto(input('English meaning'), gloss);
}

async function fillDag() {
  await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
  await choosePartOfSpeech('Other');
}

describe('CardEditor', () => {
  describe('handing off to Anki', () => {
    test('asks before opening the Add window, then sends every field', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      expect(screen.getByRole('alert').textContent).toContain("replaces whatever is in Anki's");
      expect(addRequests(requests)).toEqual([]);

      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/anki/add',
          body: {
            fields: {
              ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
              Hebrew: 'דג',
              Pointed: 'דָּג',
              Definitions: 'fish',
              'Production answer': 'דג',
            },
          },
        },
      ]);
    });

    test('asks on Cmd+Enter too', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();

      await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Replace and open' }));
      expect(addRequests(requests)).toEqual([]);
    });

    test('sends nothing when cancelled', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('button', { name: 'Open in Anki' })).toBeTruthy();
      expect(addRequests(requests)).toEqual([]);
    });

    describe('while an input is blank', () => {
      test('is disabled and says what is still needed', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        expect(
          (screen.getByRole('button', { name: 'Open in Anki' }) as HTMLButtonElement).disabled,
        ).toBe(true);
        expect(
          screen.getByText('Still needed: niqqud, English meaning, part of speech'),
        ).toBeTruthy();
      });
    });

    describe('while Anki has a problem', () => {
      test('is disabled and says why', async () => {
        const requests = stubServer({ kind: 'error', message: 'Is Anki open?' });
        render(CardEditor);
        await screen.findByText('Is Anki open?');
        await fillDag();

        const openButton = screen.getByRole('button', {
          name: 'Open in Anki',
        }) as HTMLButtonElement;
        expect(openButton.disabled).toBe(true);
        await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
        expect(screen.queryByRole('button', { name: 'Replace and open' })).toBeNull();
        expect(addRequests(requests)).toEqual([]);
      });
    });
  });

  describe('the card', () => {
    describe('while an input is blank', () => {
      test('shows no fields', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
        const card = screen.getByRole('region', { name: 'Card' });
        expect(within(card).queryAllByRole('textbox')).toEqual([]);
        expect(card.textContent).toContain('Fill in the word above');
      });
    });
  });

  describe('editing a field', () => {
    test('keeps the edit when the inputs change, until reset', async () => {
      await renderConnectedEditor();
      await fillDag();
      const definitions = noteField('Definitions');
      expect(definitions.value).toBe('fish');

      await typeInto(definitions, 'fish (animal)');
      await typeInto(input('English meaning'), 'a fish');
      expect(definitions.value).toBe('fish (animal)');

      await fireEvent.click(
        screen.getByRole('button', { name: 'Reset Definitions to suggestion' }),
      );
      expect(definitions.value).toBe('a fish');
      expect(screen.queryByRole('button', { name: 'Reset Definitions to suggestion' })).toBeNull();
    });

    describe('when composition suggests nothing for it', () => {
      test('offers no reset', async () => {
        await renderConnectedEditor();
        await fillDag();
        await typeInto(noteField('Notes'), 'a note');
        expect(screen.queryByRole('button', { name: 'Reset Notes to suggestion' })).toBeNull();
      });
    });
  });

  describe('the fields shown', () => {
    function shownFieldLabels() {
      return within(screen.getByRole('region', { name: 'Card' }))
        .getAllByRole('textbox')
        .map((textarea) => (textarea as HTMLTextAreaElement).labels[0]?.textContent);
    }

    test('leave out the inputs and the media', async () => {
      await renderConnectedEditor();
      await fillDag();
      expect(shownFieldLabels()).not.toContain('Hebrew');
      expect(shownFieldLabels()).not.toContain('Pointed');
      expect(shownFieldLabels()).not.toContain('Images');
      expect(shownFieldLabels()).not.toContain('Audio');
    });

    test('follow the part of speech', async () => {
      await renderConnectedEditor();
      await fillDag();
      await choosePartOfSpeech('Verb');
      expect(shownFieldLabels()).toContain('Binyan');
      expect(shownFieldLabels()).not.toContain('Gender');
    });

    describe('when a field is hidden after being edited', () => {
      test('sends it blank', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await choosePartOfSpeech('Verb');
        await typeInto(noteField('Binyan'), "pi'el");
        await choosePartOfSpeech('Noun');

        await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
        await screen.findByText(/Opened in Anki/);
        expect(addRequests(requests)[0]?.body).toMatchObject({ fields: { Binyan: '' } });
      });
    });
  });

  describe('the deck check', () => {
    describe('when the word is in the deck', () => {
      test('warns, naming the note', async () => {
        await renderConnectedEditor({
          exactMatches: [{ noteId: 1751686072898, unpointed: 'כלב', pointed: 'כֶּלֶב' }],
          relatedMatches: [],
        });
        await typeInto(input('Hebrew word, without niqqud'), 'כלב');
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect(await within(check).findByText('Already in the deck')).toBeTruthy();
        expect(within(check).getByRole('listitem').textContent).toBe('כֶּלֶב');
      });
    });

    describe('when only related notes are in the deck', () => {
      test('lists them without warning', async () => {
        await renderConnectedEditor({
          exactMatches: [],
          relatedMatches: [{ noteId: 1752426864218, unpointed: 'בית משפט', pointed: 'בֵּית מִשְׁפָּט' }],
        });
        await typeInto(input('Hebrew word, without niqqud'), 'בית');
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect(await within(check).findByText('Related notes in the deck')).toBeTruthy();
        expect(within(check).queryByText('Already in the deck')).toBeNull();
      });
    });

    describe('when the word is not in the deck', () => {
      test('says so quietly', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        expect(await screen.findByText('Not in the deck yet.')).toBeTruthy();
      });
    });
  });

  describe('a link that needs an input still blank', () => {
    test('is disabled and says which input to fill', async () => {
      await renderConnectedEditor();
      await typeInto(input('Hebrew word, without niqqud'), 'דג');
      const links = screen.getByRole('navigation', { name: 'Look up' });
      expect(within(links).queryByRole('link', { name: 'Images (EN)' })).toBeNull();
      expect(within(links).getByText('Images (EN)').title).toBe('Type the English meaning first');
      expect(within(links).getByRole('link', { name: 'Images (HE)' })).toBeTruthy();
    });
  });
});
