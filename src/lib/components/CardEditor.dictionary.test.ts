// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import {
  choosePartOfSpeech,
  handOff,
  input,
  renderConnectedEditor,
  type ServerRequest,
  skipImage,
  typeInto,
} from './CardEditor.harness.ts';

describe('CardEditor', () => {
  describe('the dictionary', () => {
    // As the lookup answers for the fixture dictionary.
    const kelev: DictionaryCandidate = {
      id: 1,
      title: 'כלב',
      pointed: 'כֶּלֶב',
      wiktionaryPartOfSpeech: 'noun',
      definitions: ['dog', '(derogatory) scoundrel, bitch'],
      roots: [],
      partOfSpeech: 'noun',
      noun: {
        gender: { gender: 'm', pluralOnly: false },
        plurals: ['כְּלָבִים'],
        feminineSingulars: ['כַּלְבָּה'],
        femininePlurals: ['כְּלָבוֹת'],
      },
    };

    const chika: DictionaryCandidate = {
      id: 42,
      title: 'חיכה',
      pointed: 'חִכָּה',
      wiktionaryPartOfSpeech: 'verb',
      definitions: ['to wait, wait for [with לְ־ ‘for’]'],
      roots: ['ח־כ־ה'],
      partOfSpeech: 'verb',
      verb: {
        binyan: "pi'el",
        infinitives: [{ pointed: 'לְחַכּוֹת', unpointed: 'לחכות' }],
        presents: ['מְחַכֶּה'],
        futures: ['יְחַכֶּה'],
        prepositions: ['ל'],
      },
    };

    const yisraeli: DictionaryCandidate = {
      id: 53,
      title: 'ישראלי',
      pointed: 'יִשְׂרְאֵלִי',
      wiktionaryPartOfSpeech: 'adj',
      definitions: ['Israeli: of or pertaining to the State of Israel.'],
      roots: [],
      partOfSpeech: 'adjective',
      adjective: {
        feminineSingulars: ['יִשְׂרְאֵלִית'],
        masculinePlurals: ['יִשְׂרְאֵלִים', 'יִשְׂרְאֵלִיִּים'],
        femininePlurals: ['יִשְׂרְאֵלִיּוֹת'],
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
      await skipImage();
      expect(await handOff(requests)).toEqual({
        fields: {
          ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
          Hebrew: 'כלב',
          Pointed: 'כֶּלֶב',
          Definitions: 'dog',
          'Production answer': 'כלב טוב',
          'Part of speech': 'noun',
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

    test('fills a verb’s infinitive, forms, binyan and root, and only suggests its preposition', async () => {
      const requests = await renderConnectedEditor(undefined, found(chika));
      await pick('חיכה', 'חִכָּה');

      expect(input('Hebrew word, without niqqud').value).toBe('לחכות');
      expect(input('Hebrew word, with niqqud').value).toBe('לְחַכּוֹת');
      expect(input('Past (he), with niqqud').value).toBe('חִכָּה');
      expect(input('Present (he), with niqqud').value).toBe('מְחַכֶּה');
      expect(input('Future (he), with niqqud').value).toBe('יְחַכֶּה');
      expect((screen.getByRole('combobox', { name: 'Binyan' }) as HTMLSelectElement).value).toBe(
        "pi'el",
      );
      expect(input('Root, like דבר or ד.ב.ר').value).toBe('ח־כ־ה');
      expect(screen.getByText(/Wiktionary suggests/).textContent).toContain('ל');
      expect((screen.getByRole('radio', { name: 'ל' }) as HTMLInputElement).checked).toBe(false);
      expect(screen.getByText('Still needed: English meaning, preposition, image')).toBeTruthy();
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

    describe('for a verb with two futures', () => {
      test('offers both, and choosing one fills the future', async () => {
        await renderConnectedEditor(
          undefined,
          found({ ...chika, verb: { ...chika.verb, futures: ['יַחֲדֹר', 'יַחְדֹּר'] } }),
        );
        await pick('חדר', 'חִכָּה');
        expect(input('Future (he), with niqqud').value).toBe('');

        await fireEvent.click(screen.getByRole('button', { name: 'יַחְדֹּר' }));
        expect(input('Future (he), with niqqud').value).toBe('יַחְדֹּר');
      });
    });

    describe('for a verb, after choosing another', () => {
      test('clears the forms it filled', async () => {
        await renderConnectedEditor(undefined, found(chika));
        await pick('חיכה', 'חִכָּה');
        await fireEvent.click(screen.getByRole('button', { name: 'Choose another' }));
        await choosePartOfSpeech('Verb');

        expect(input('Past (he), with niqqud').value).toBe('');
        expect(input('Present (he), with niqqud').value).toBe('');
        expect(input('Future (he), with niqqud').value).toBe('');
      });
    });

    describe('for a noun with a root', () => {
      test('fills the root, and undoes it with the rest', async () => {
        await renderConnectedEditor(undefined, found({ ...kelev, roots: ['כ־ל־ב'] }));
        await pick('כלבים', 'כֶּלֶב');
        expect(input('Root, like דבר or ד.ב.ר').value).toBe('כ־ל־ב');

        await fireEvent.click(screen.getByRole('button', { name: 'Choose another' }));
        await choosePartOfSpeech('Noun');
        expect(input('Root, like דבר or ד.ב.ר').value).toBe('');
      });
    });

    describe('for an adjective with two masculine plurals', () => {
      test('fills its forms, and choosing one fills that form', async () => {
        await renderConnectedEditor(undefined, found(yisraeli));
        await pick('ישראלית', 'יִשְׂרְאֵלִי');
        expect(screen.getByRole('radio', { name: 'Adjective', checked: true })).toBeTruthy();
        expect(input('Feminine singular, with niqqud').value).toBe('יִשְׂרְאֵלִית');
        expect(input('Feminine plural, with niqqud').value).toBe('יִשְׂרְאֵלִיּוֹת');
        expect(input('Masculine plural, with niqqud').value).toBe('');

        await fireEvent.click(screen.getByRole('button', { name: 'יִשְׂרְאֵלִים' }));
        expect(input('Masculine plural, with niqqud').value).toBe('יִשְׂרְאֵלִים');
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
});
