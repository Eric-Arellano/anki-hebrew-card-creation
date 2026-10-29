// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import { FIELDS } from '#lib/note-type.ts';
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
  return screen.getByLabelText(label) as HTMLInputElement;
}

function noteField(fieldName: string) {
  return screen.getByLabelText(fieldName) as HTMLTextAreaElement;
}

async function typeInto(element: HTMLElement, value: string) {
  await fireEvent.input(element, { target: { value } });
}

async function choosePartOfSpeech(label: string) {
  await fireEvent.click(screen.getByRole('radio', { name: label }));
}

async function chooseNoun(gender: string) {
  await choosePartOfSpeech('Noun');
  await fireEvent.click(screen.getByRole('radio', { name: gender }));
}

async function fillInputs({
  word,
  pointed,
  gloss,
}: {
  word: string;
  pointed: string;
  gloss: string;
}) {
  await typeInto(input('Hebrew word, without niqqud'), word);
  await typeInto(input('English meaning'), gloss);
  await typeInto(input('Hebrew word, with niqqud'), pointed);
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
          screen.getByText(
            'Still needed: English meaning, part of speech, Hebrew word with niqqud',
          ),
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

  describe('two meanings', () => {
    test('send numbered definitions, and each has its own image search', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
      await typeInto(input('English meaning 2'), 'Pisces');

      expect(
        screen
          .getAllByRole('link', { name: 'Images (EN)' })
          .map((link) => link.getAttribute('href')),
      ).toEqual([
        'https://www.google.com/search?udm=2&q=fish',
        'https://www.google.com/search?udm=2&q=Pisces',
      ]);
      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)[0]?.body).toMatchObject({
        fields: { Definitions: '1. fish<br>2. Pisces' },
      });
    });

    describe('after removing the second', () => {
      test('send the first alone', async () => {
        await renderConnectedEditor();
        await fillDag();
        await fireEvent.click(screen.getByRole('button', { name: '+ Another meaning' }));
        await typeInto(input('English meaning 2'), 'Pisces');
        await fireEvent.click(screen.getByRole('button', { name: 'Remove English meaning 2' }));
        expect(screen.queryByLabelText('English meaning 2')).toBeNull();
        expect(screen.getAllByRole('link', { name: 'Images (EN)' })).toHaveLength(1);
      });
    });
  });

  describe('the note fields', () => {
    describe('before the part of speech is chosen', () => {
      test('are not shown', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
        expect(screen.queryByLabelText('Notes')).toBeNull();
      });
    });

    describe('once the part of speech is chosen', () => {
      test('are shown, even while another input is blank', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Other');
        expect(noteField('Notes')).toBeTruthy();
      });
    });

    test('explain when to fill a field, outside the field', async () => {
      await renderConnectedEditor();
      await choosePartOfSpeech('Other');
      const readingContext = noteField('Hint for reading the Hebrew without niqqud');
      expect(readingContext.placeholder).toBe('');
      expect(
        document.getElementById(readingContext.getAttribute('aria-describedby') ?? '')?.textContent,
      ).toBe(FIELDS.readingContext.help);
    });

    test('send an edit under its name in Anki', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await typeInto(noteField('Hint for reading the Hebrew without niqqud'), 'הדג גדול');

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)[0]?.body).toMatchObject({
        fields: { 'Reading context': 'הדג גדול' },
      });
    });

    test('send each new line as a line break', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await typeInto(noteField('Notes'), 'first\nsecond');

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)[0]?.body).toMatchObject({
        fields: { Notes: 'first<br>second' },
      });
    });

    describe('for a variant', () => {
      test('search images for its prompt, once there is one', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Other');
        const prompt = noteField('Variant 1: English prompt');
        const promptField = prompt.parentElement as HTMLElement;
        expect(within(promptField).getByText('Images (EN)').title).toBe('Type the prompt first');
        await typeInto(prompt, 'good tables');
        expect(
          within(promptField).getByRole('link', { name: 'Images (EN)' }).getAttribute('href'),
        ).toBe('https://www.google.com/search?udm=2&q=good%20tables');
      });
    });
  });

  describe('the fields shown', () => {
    function shownFieldIds() {
      return [...document.querySelectorAll('textarea')].map((textarea) => textarea.id);
    }

    test('leave out the inputs and the media', async () => {
      await renderConnectedEditor();
      await fillDag();
      for (const field of ['unpointed', 'pointed', 'definitions', 'images', 'audio']) {
        expect(shownFieldIds()).not.toContain(`field-${field}`);
      }
    });

    test('follow the part of speech', async () => {
      await renderConnectedEditor();
      await fillDag();
      await choosePartOfSpeech('Verb');
      expect(shownFieldIds()).toContain('field-binyan');
      expect(shownFieldIds()).not.toContain('field-gender');
    });

    describe('when a field is hidden after being edited', () => {
      test('sends its suggestion instead', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await typeInto(noteField('Other forms'), 'f: דָּגָה');
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'דָּגִים');

        await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
        await screen.findByText(/Opened in Anki/);
        expect(addRequests(requests)[0]?.body).toMatchObject({ fields: { Forms: 'pl: דָּגִים' } });
      });

      test('sends it blank when it has no suggestion', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await choosePartOfSpeech('Verb');
        await typeInto(noteField('Binyan'), "pi'el");
        await chooseNoun('Masculine');

        await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
        await screen.findByText(/Opened in Anki/);
        expect(addRequests(requests)[0]?.body).toMatchObject({ fields: { Binyan: '' } });
      });
    });
  });

  describe('a noun', () => {
    async function handOff(requests: ServerRequest[]) {
      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      return addRequests(requests)[0]?.body;
    }

    test('sends its production answer, gender and forms', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
      await chooseNoun('Masculine');
      await typeInto(input('Masculine plural, with niqqud'), 'כְּלָבִים');
      await typeInto(input('Feminine singular, with niqqud'), 'כַּלְבָּה');
      await typeInto(input('Feminine plural, with niqqud'), 'כְּלָבוֹת');

      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'כלב',
          Pointed: 'כֶּלֶב',
          Definitions: 'dog',
          'Production answer': 'כלב טוב',
          Gender: 'm',
          Forms: 'f: כַּלְבָּה<br>m.pl: כְּלָבִים<br>f.pl: כְּלָבוֹת',
        },
      });
    });

    test('requires only the pointed word of its forms', async () => {
      await renderConnectedEditor();
      await chooseNoun('Masculine');
      expect(
        [
          'Hebrew word, with niqqud',
          'Masculine plural, with niqqud',
          'Feminine singular, with niqqud',
          'Feminine plural, with niqqud',
        ].map((label) => input(label).required),
      ).toEqual([true, false, false, false]);
    });

    describe('of feminine gender', () => {
      test('asks only for its plural, and sends no counterpart typed under masculine', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'שנה', pointed: 'שָׁנָה', gloss: 'year' });
        await chooseNoun('Masculine');
        await typeInto(input('Feminine singular, with niqqud'), 'שָׁנָה');
        await chooseNoun('Feminine');
        expect(screen.queryByLabelText('Feminine singular, with niqqud')).toBeNull();
        await typeInto(input('Plural, with niqqud'), 'שָׁנִים');

        expect(await handOff(requests)).toEqual({
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'שנה',
            Pointed: 'שָׁנָה',
            Definitions: 'year',
            'Production answer': 'שנה טובה',
            Gender: 'f',
            Forms: 'pl: שָׁנִים',
          },
        });
      });
    });

    describe('that is only plural', () => {
      test('asks for no forms, and answers in the plural', async () => {
        const requests = await renderConnectedEditor();
        await fillInputs({ word: 'מים', pointed: 'מַיִם', gloss: 'water' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'מַיִם');
        await fireEvent.click(screen.getByRole('checkbox', { name: /Only plural/ }));
        expect(screen.queryByLabelText(/plural, with niqqud/i)).toBeNull();

        expect(await handOff(requests)).toEqual({
          fields: {
            ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
            Hebrew: 'מים',
            Pointed: 'מַיִם',
            Definitions: 'water',
            'Production answer': 'מים טובים',
            Gender: 'm',
          },
        });
      });
    });

    describe('while its gender is unchosen', () => {
      test('asks for no forms and says the gender is needed', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
        await choosePartOfSpeech('Noun');
        expect(screen.queryByLabelText(/plural, with niqqud/i)).toBeNull();
        expect(screen.getByText('Still needed: gender')).toBeTruthy();
      });
    });

    describe('after switching away and back', () => {
      test('keeps its inputs', async () => {
        await renderConnectedEditor();
        await chooseNoun('Feminine');
        await typeInto(input('Plural, with niqqud'), 'שָׁנִים');
        await choosePartOfSpeech('Other');
        await choosePartOfSpeech('Noun');
        expect((input('Plural, with niqqud') as HTMLInputElement).value).toBe('שָׁנִים');
        expect((screen.getByRole('radio', { name: 'Feminine' }) as HTMLInputElement).checked).toBe(
          true,
        );
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
      const links = screen.getByRole('navigation', { name: 'Look up' });
      expect(within(links).getByText('Wiktionary').title).toBe(
        'Type the Hebrew word without niqqud first',
      );
      await typeInto(input('Hebrew word, without niqqud'), 'דג');
      expect(within(links).getByRole('link', { name: 'Images (HE)' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Images (EN)' })).toBeNull();
      expect(screen.getByText('Images (EN)').title).toBe('Type the meaning first');
    });
  });
});
