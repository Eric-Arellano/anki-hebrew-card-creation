// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { AnkiStatus, ExistingNotes } from '#lib/api/anki.ts';
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import { FIELDS } from '#lib/note-type.ts';
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

const notInDictionary: DictionaryLookup = {
  match: 'exact',
  candidates: [],
  titleHasEntry: false,
  staleIndex: false,
};

/** Our server, answering the editor's API calls, and recording every request. */
function stubServer(
  status: AnkiStatus = connectedStatus,
  existing: ExistingNotes = { exactMatches: [], relatedMatches: [] },
  lookup: DictionaryLookup | Response = notInDictionary,
) {
  const requests: ServerRequest[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method: init?.method ?? 'GET', path: input, body });
    if (input === '/api/anki/status') return Response.json(status);
    if (input.startsWith('/api/anki/existing')) {
      return Response.json(existing);
    }
    if (input.startsWith('/api/lookup')) {
      return lookup instanceof Response ? lookup : Response.json(lookup);
    }
    if (input === '/api/anki/add') return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  });
  return requests;
}

function addRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/anki/add');
}

async function renderConnectedEditor(
  existing?: ExistingNotes,
  lookup?: DictionaryLookup | Response,
) {
  const requests = stubServer(connectedStatus, existing, lookup);
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

async function fillVerb(binyan: string, root: string) {
  await choosePartOfSpeech('Verb');
  await fireEvent.change(screen.getByRole('combobox', { name: 'Binyan' }), {
    target: { value: binyan },
  });
  await typeInto(input('Root, like דבר or ד.ב.ר'), root);
}

async function handOff(requests: ServerRequest[]) {
  await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
  await screen.findByText(/Opened in Anki/);
  return addRequests(requests)[0]?.body;
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

    describe('for the variants', () => {
      test('explain with examples for the part of speech', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Verb');
        const answer = noteField('Variant 1: Hebrew answer, with niqqud');
        expect(
          document.getElementById(answer.getAttribute('aria-describedby') ?? '')?.textContent,
        ).toBe(FIELDS.variant1Answer.help.verb);
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
      expect(shownFieldIds()).toContain('field-forms');
      await choosePartOfSpeech('Verb');
      expect(shownFieldIds()).not.toContain('field-forms');
      expect(shownFieldIds()).toContain('field-notes');
    });

    describe('when a field is hidden after being edited', () => {
      test('sends what composition gives it instead', async () => {
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

      test('sends it blank when composition gives it nothing', async () => {
        const requests = await renderConnectedEditor();
        await fillDag();
        await typeInto(noteField('Other forms'), 'f: דָּגָה');
        await fillVerb("pa'al", 'דוג');
        await fireEvent.click(screen.getByRole('radio', { name: 'None' }));

        await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
        await screen.findByText(/Opened in Anki/);
        expect(addRequests(requests)[0]?.body).toMatchObject({ fields: { Forms: '' } });
      });
    });
  });

  describe('a noun', () => {
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

  describe('a verb', () => {
    test('sends its production answer with its preposition, and its binyan and root', async () => {
      const requests = await renderConnectedEditor();
      await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
      await fillVerb("pi'el", 'ד.ב.ר');
      await fireEvent.click(screen.getByRole('radio', { name: 'עם' }));
      expect(screen.getByText(/Writes the root as/).textContent?.trim()).toBe(
        'Writes the root as ד־ב־ר.',
      );

      await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
      await screen.findByText(/Opened in Anki/);
      expect(addRequests(requests)[0]?.body).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'לדבר',
          Pointed: 'לְדַבֵּר',
          Definitions: 'to speak',
          'Production answer': 'לדבר עם',
          Binyan: "pi'el",
          Root: 'ד־ב־ר',
        },
      });
    });

    test('starts with nothing chosen, and needs its preposition, binyan and root', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'לראות', pointed: 'לִרְאוֹת', gloss: 'to see' });
      await choosePartOfSpeech('Verb');
      expect(
        screen.getAllByRole('radio', { checked: true }).map((radio) => radio.getAttribute('name')),
      ).toEqual(['part-of-speech']);
      expect(screen.getByText('Still needed: preposition, binyan, root')).toBeTruthy();
    });

    describe('with a root that is not only letters', () => {
      test('says what to type, and still needs the root', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'לדבר', pointed: 'לְדַבֵּר', gloss: 'to speak' });
        await fillVerb("pi'el", 'דִּבֵּר');
        await fireEvent.click(screen.getByRole('radio', { name: 'את' }));
        expect(screen.getByText(/Type only the root's Hebrew letters/)).toBeTruthy();
        expect(screen.getByText('Still needed: root')).toBeTruthy();
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

  describe('the dictionary', () => {
    // As the lookup answers for the fixture dictionary.
    const kelev: DictionaryCandidate = {
      id: 1,
      title: 'כלב',
      pointed: 'כֶּלֶב',
      pos: 'noun',
      glosses: ['dog', '(derogatory) scoundrel, bitch'],
      roots: [],
      partOfSpeech: 'noun',
      noun: {
        gender: { gender: 'm', pluralOnly: false },
        plurals: ['כְּלָבִים'],
        feminines: ['כַּלְבָּה'],
        femininePlurals: ['כְּלָבוֹת'],
      },
    };

    const chika: DictionaryCandidate = {
      id: 42,
      title: 'חיכה',
      pointed: 'חִכָּה',
      pos: 'verb',
      glosses: ['to wait, wait for [with לְ־ ‘for’]'],
      roots: ['ח־כ־ה'],
      partOfSpeech: 'verb',
      verb: {
        binyan: "pi'el",
        infinitives: [{ pointed: 'לְחַכּוֹת', unpointed: 'לחכות' }],
        prepositions: ['ל'],
      },
    };

    function found(...candidates: DictionaryCandidate[]): DictionaryLookup {
      return { match: 'exact', candidates, titleHasEntry: true, staleIndex: false };
    }

    async function pick(typed: string, pointed: string) {
      await typeInto(input('Hebrew word, without niqqud'), typed);
      const dictionary = screen.getByRole('region', { name: 'Dictionary' });
      await fireEvent.click(
        await within(dictionary).findByRole('button', { name: new RegExp(pointed) }),
      );
    }

    function lookups(requests: ServerRequest[]) {
      return requests.filter((request) => request.path.startsWith('/api/lookup'));
    }

    test('fills a noun’s inputs from the entry picked, and shows its meanings', async () => {
      const requests = await renderConnectedEditor(undefined, found(kelev));
      await typeInto(input('English meaning'), 'dog');
      await pick('כלבים', 'כֶּלֶב');

      expect(input('Hebrew word, without niqqud').value).toBe('כלב');
      expect(screen.getByRole('list', { name: "Wiktionary's meanings" }).textContent).toContain(
        'scoundrel',
      );
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

    describe('once another word is typed over the one it filled', () => {
      test('looks that word up, and clears what the entry filled', async () => {
        const requests = await renderConnectedEditor(undefined, found(kelev));
        await pick('כלבים', 'כֶּלֶב');
        expect(lookups(requests)).toHaveLength(1);

        await typeInto(input('Hebrew word, without niqqud'), 'חתול');
        expect(await screen.findByText('Which word is it?')).toBeTruthy();
        expect(lookups(requests).map((request) => request.path)).toEqual([
          `/api/lookup?word=${encodeURIComponent('כלבים')}`,
          `/api/lookup?word=${encodeURIComponent('חתול')}`,
        ]);
        expect(input('Hebrew word, without niqqud').value).toBe('חתול');
        expect(input('Hebrew word, with niqqud').value).toBe('');
        expect(screen.queryByRole('radio', { name: 'Noun', checked: true })).toBeNull();
      });
    });

    describe('once another spelling of the word it filled is typed', () => {
      test('keeps the entry and what it filled', async () => {
        const requests = await renderConnectedEditor(
          undefined,
          found({ ...kelev, title: 'שולחן', pointed: 'שֻׁלְחָן' }),
        );
        await pick('שולחנות', 'שֻׁלְחָן');
        await typeInto(input('Hebrew word, without niqqud'), 'שלחן');

        expect(screen.getByText('Filled in from Wiktionary:')).toBeTruthy();
        expect(input('Hebrew word, with niqqud').value).toBe('שֻׁלְחָן');
        expect(lookups(requests)).toHaveLength(1);
      });
    });

    describe('after choosing another', () => {
      test('offers the entries for the word as typed, and clears what the entry filled', async () => {
        await renderConnectedEditor(undefined, found(kelev));
        await pick('כלבים', 'כֶּלֶב');
        await fireEvent.click(screen.getByRole('button', { name: 'Choose another' }));

        expect(input('Hebrew word, without niqqud').value).toBe('כלבים');
        expect(input('Hebrew word, with niqqud').value).toBe('');
        expect(await screen.findByText('Which word is it?')).toBeTruthy();
        const dictionary = screen.getByRole('region', { name: 'Dictionary' });
        expect(within(dictionary).getByRole('button', { name: /כֶּלֶב/ })).toBeTruthy();
      });
    });

    test('fills a verb’s infinitive, binyan and root, and only suggests its preposition', async () => {
      const requests = await renderConnectedEditor(undefined, found(chika));
      await pick('חיכה', 'חִכָּה');

      expect(input('Hebrew word, without niqqud').value).toBe('לחכות');
      expect(input('Hebrew word, with niqqud').value).toBe('לְחַכּוֹת');
      expect((screen.getByRole('combobox', { name: 'Binyan' }) as HTMLSelectElement).value).toBe(
        "pi'el",
      );
      expect(input('Root, like דבר or ד.ב.ר').value).toBe('ח־כ־ה');
      expect(screen.getByText(/Wiktionary suggests/).textContent).toContain('ל');
      expect((screen.getByRole('radio', { name: 'ל' }) as HTMLInputElement).checked).toBe(false);
      expect(screen.getByText('Still needed: English meaning, preposition')).toBeTruthy();
      // The deck check searches the lemma too, which old notes for verbs hold.
      await vi.waitFor(() =>
        expect(requests.map((request) => request.path)).toContain(
          `/api/anki/existing?word=${encodeURIComponent('לחכות')}&word=${encodeURIComponent('חיכה')}`,
        ),
      );
    });

    describe('for a verb with two infinitives', () => {
      test('offers both, and choosing one fills both spellings', async () => {
        await renderConnectedEditor(
          undefined,
          found({
            ...chika,
            verb: {
              ...chika.verb,
              infinitives: [
                { pointed: 'לַחֲדֹר', unpointed: 'לחדור' },
                { pointed: 'לַחְדֹּר', unpointed: 'לחדור' },
              ],
            },
          }),
        );
        await pick('חדר', 'חִכָּה');
        expect(input('Hebrew word, with niqqud').value).toBe('');

        await fireEvent.click(screen.getByRole('button', { name: 'לַחְדֹּר' }));
        expect(input('Hebrew word, with niqqud').value).toBe('לַחְדֹּר');
        expect(input('Hebrew word, without niqqud').value).toBe('לחדור');
      });
    });

    describe('for a word not in it', () => {
      test('says so, and marks the Wiktionary link', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'זזזז');
        expect(await screen.findByText('Not in the dictionary.')).toBeTruthy();
        const links = screen.getByRole('navigation', { name: 'Look up' });
        expect(within(links).getByRole('link', { name: /Wiktionary/ }).textContent).toContain(
          'no entry',
        );
      });
    });

    describe('once an entry is picked', () => {
      test('points the Wiktionary link at its page', async () => {
        await renderConnectedEditor(undefined, found(kelev));
        await pick('כלבים', 'כֶּלֶב');
        const links = screen.getByRole('navigation', { name: 'Look up' });
        expect(within(links).getByRole('link', { name: 'Wiktionary' }).getAttribute('href')).toBe(
          `https://en.wiktionary.org/wiki/${encodeURIComponent('כלב')}#Hebrew`,
        );
      });
    });

    describe('without an index', () => {
      test('says how to build one', async () => {
        const message = "There's no dictionary index yet. Run npm run build-index.";
        await renderConnectedEditor(undefined, Response.json({ message }, { status: 503 }));
        await typeInto(input('Hebrew word, without niqqud'), 'כלב');
        expect((await screen.findByRole('alert')).textContent).toBe(message);
      });
    });
  });

  describe('an irregular plural', () => {
    test('offers to fill the first free variant with it', async () => {
      await renderConnectedEditor();
      await fillInputs({ word: 'שולחן', pointed: 'שֻׁלְחָן', gloss: 'table' });
      await chooseNoun('Masculine');
      await typeInto(input('Masculine plural, with niqqud'), 'שֻׁלְחָנוֹת');
      await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'שֻׁלְחָן');

      const hint = screen.getByRole('region', { name: 'Irregular plural' });
      expect(hint.textContent).toContain('a masculine noun, but its plural ends in ־ות');
      await fireEvent.click(within(hint).getByRole('button', { name: /as Variant 2/ }));

      expect(noteField('Variant 2: Hebrew answer, with niqqud').value).toBe('שֻׁלְחָנוֹת טוֹבִים');
      expect(hint.textContent).toContain('Variant 2 has it.');
    });

    describe('once both variants hold other answers', () => {
      test('says so, and offers nothing', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'שולחן', pointed: 'שֻׁלְחָן', gloss: 'table' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'שֻׁלְחָנוֹת');
        await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'שֻׁלְחָן');
        await typeInto(noteField('Variant 2: Hebrew answer, with niqqud'), 'שֻׁלְחָן גָּדוֹל');

        const hint = screen.getByRole('region', { name: 'Irregular plural' });
        expect(hint.textContent).toContain('Both variants are in use.');
        expect(within(hint).queryByRole('button')).toBeNull();
      });
    });

    describe('for a regular plural', () => {
      test('offers nothing', async () => {
        await renderConnectedEditor();
        await fillInputs({ word: 'כלב', pointed: 'כֶּלֶב', gloss: 'dog' });
        await chooseNoun('Masculine');
        await typeInto(input('Masculine plural, with niqqud'), 'כְּלָבִים');
        expect(screen.queryByRole('region', { name: 'Irregular plural' })).toBeNull();
      });
    });
  });
});
