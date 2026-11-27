// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { VerbMeaningSuggestions } from '#lib/api/ai.ts';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import {
  choosePartOfSpeech,
  fillInputs,
  heldReply,
  input,
  renderConnectedEditor,
  type ServerRequest,
  typeInto,
} from './CardEditor.harness.ts';

// As `/api/ai/verb-meanings` answers for לִשְׁמֹר and “to keep, guard”, from the captured reply in
// `tests/fixtures/claude/`.
const lishmorSplit: VerbMeaningSuggestions = {
  meanings: [
    { english: 'to keep', preposition: 'את', fromIndex: 0, usage: 'שומר את הקבלה' },
    { english: 'to guard, look after', preposition: 'על', fromIndex: 0, usage: 'שומר על הילדים' },
  ],
};

// As Claude answered in trials of the prompt: once keeping the line and adding two meanings, and
// once overriding the preposition chosen.
const lishmorAdded: VerbMeaningSuggestions = {
  meanings: [
    { english: 'to keep, guard', preposition: 'את', fromIndex: 0, usage: 'שומר את הכסף' },
    { english: 'to look after, protect', preposition: 'על', usage: 'שומר על הילדים' },
    { english: 'to save (a file)', preposition: 'את', usage: 'שמרתי את הקובץ' },
  ],
};
const laazorOverridden: VerbMeaningSuggestions = {
  meanings: [
    {
      english: 'to help',
      preposition: 'ל',
      fromIndex: 0,
      usage: 'עוזר לחבר',
      note: 'Changed from את: לעזור takes ל before the person helped (עוזר לו).',
    },
  ],
};

// As the lookup answers for the fixture dictionary.
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

function suggestButton() {
  return screen.getByRole('button', { name: 'Suggest meanings with Claude' }) as HTMLButtonElement;
}

function useButton() {
  return screen.getByRole('button', { name: 'Use these' }) as HTMLButtonElement;
}

function verbMeaningsRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/ai/verb-meanings');
}

function status() {
  return document.getElementById('verb-meanings-status')?.textContent?.trim();
}

async function clickSuggest() {
  await fireEvent.click(suggestButton());
  await waitFor(() => expect(suggestButton().getAttribute('aria-busy')).toBe('false'));
}

async function fillVerb(word: string, pointed: string, gloss: string) {
  await fillInputs({ word, pointed, gloss });
  await choosePartOfSpeech('Verb');
}

function meaningInputs(): string[] {
  return screen
    .getAllByLabelText(/^English meaning( \d+)?$/, { selector: 'input' })
    .map((element) => (element as HTMLInputElement).value);
}

function chosenPreposition(meaning: string): string | undefined {
  const group = screen.getByRole('group', { name: meaning });
  const checked = within(group).queryByRole('radio', { checked: true });
  return checked?.closest('label')?.textContent?.trim();
}

describe('CardEditor', () => {
  describe('suggesting a verb’s meanings', () => {
    test('asks with the verb, its niqqud, and each meaning with any preposition chosen', async () => {
      const requests = await renderConnectedEditor({
        verbMeanings: () => Response.json(lishmorSplit),
      });
      await fillVerb('לעזור', 'לַעֲזֹר', 'to help');
      await fireEvent.click(screen.getByRole('radio', { name: 'אֶת' }));
      await clickSuggest();
      expect(verbMeaningsRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/ai/verb-meanings',
          body: {
            word: 'לעזור',
            pointed: 'לַעֲזֹר',
            meanings: [{ english: 'to help', preposition: 'את' }],
            dictionaryDefinitions: [],
            dictionaryPrepositions: [],
          },
        },
      ]);
    });

    test('asks with the picked entry’s definitions and prepositions, before any meaning', async () => {
      const requests = await renderConnectedEditor({
        lookup: { match: 'exact', candidates: [chika], titleHasEntry: true, staleIndex: false },
      });
      await typeInto(input('Hebrew word, without niqqud'), 'חיכה');
      const dictionary = screen.getByRole('region', { name: 'Dictionary' });
      await fireEvent.click(await within(dictionary).findByRole('button', { name: /חִכָּה/ }));
      await clickSuggest();
      expect(verbMeaningsRequests(requests).map(({ body }) => body)).toEqual([
        {
          word: 'לחכות',
          pointed: 'לְחַכּוֹת',
          meanings: [],
          dictionaryDefinitions: ['to wait, wait for [with לְ־ ‘for’]'],
          dictionaryPrepositions: ['ל'],
        },
      ]);
    });

    describe('when Claude splits a line', () => {
      test('shows where each part came from, and uses them with their prepositions', async () => {
        await renderConnectedEditor({ verbMeanings: () => Response.json(lishmorSplit) });
        await fillVerb('לשמור', 'לִשְׁמֹר', 'to keep, guard');
        await clickSuggest();
        const proposal = screen.getByRole('region', { name: 'Claude’s meanings' });
        expect(
          within(proposal)
            .getAllByRole('checkbox')
            .map((checkbox) => checkbox.closest('label')?.textContent?.replace(/\s+/g, ' ').trim()),
        ).toEqual([
          'to keep אֶת From your “to keep, guard”',
          'to guard, look after עַל From your “to keep, guard”',
        ]);
        expect(within(proposal).getByText('שומר על הילדים')).toBeTruthy();

        await fireEvent.click(useButton());
        expect(meaningInputs()).toEqual(['to keep', 'to guard, look after']);
        expect(chosenPreposition('to keep')).toBe('אֶת');
        expect(chosenPreposition('to guard, look after')).toBe('עַל');
        expect(screen.queryByRole('region', { name: 'Claude’s meanings' })).toBeNull();
      });
    });

    describe('with a meaning unchecked', () => {
      test('leaves it out', async () => {
        await renderConnectedEditor({ verbMeanings: () => Response.json(lishmorAdded) });
        await fillVerb('לשמור', 'לִשְׁמֹר', 'to keep, guard');
        await clickSuggest();
        await fireEvent.click(screen.getByRole('checkbox', { name: /to save \(a file\)/ }));

        await fireEvent.click(useButton());
        expect(meaningInputs()).toEqual(['to keep, guard', 'to look after, protect']);
        expect(chosenPreposition('to look after, protect')).toBe('עַל');
      });
    });

    describe('when Claude overrides a preposition chosen', () => {
      test('says which was chosen, and why it changed', async () => {
        await renderConnectedEditor({ verbMeanings: () => Response.json(laazorOverridden) });
        await fillVerb('לעזור', 'לַעֲזֹר', 'to help');
        await fireEvent.click(screen.getByRole('radio', { name: 'אֶת' }));
        await clickSuggest();
        const proposal = screen.getByRole('region', { name: 'Claude’s meanings' });
        expect(
          within(proposal).getByRole('checkbox', { name: 'to help לְ־ You chose אֶת' }),
        ).toBeTruthy();
        expect(within(proposal).getByText(/לעזור takes ל before the person helped/)).toBeTruthy();

        await fireEvent.click(screen.getByRole('checkbox', { name: /to help/ }));
        expect(useButton().disabled).toBe(true);
      });
    });

    describe('when Claude would change nothing', () => {
      test('says so, and shows nothing to use', async () => {
        await renderConnectedEditor({
          verbMeanings: () =>
            Response.json({ meanings: [{ english: 'to help', preposition: 'ל', fromIndex: 0 }] }),
        });
        await fillVerb('לעזור', 'לַעֲזֹר', 'to help');
        await fireEvent.click(screen.getByRole('radio', { name: 'לְ־' }));
        await clickSuggest();
        expect(status()).toBe('Claude would keep the meanings and prepositions as they are.');
        expect(screen.queryByRole('button', { name: 'Use these' })).toBeNull();
      });
    });

    describe('when Claude would change nothing, but notes another preposition', () => {
      test('shows the note, with nothing to use', async () => {
        const note = 'על is as common here: שמח על ההצלחה.';
        await renderConnectedEditor({
          verbMeanings: () =>
            Response.json({
              meanings: [{ english: 'to be happy about', preposition: 'ב', fromIndex: 0, note }],
            }),
        });
        await fillVerb('לשמוח', 'לִשְׂמֹחַ', 'to be happy about');
        await fireEvent.click(screen.getByRole('radio', { name: 'בְּ־' }));
        await clickSuggest();
        expect(status()).toBe(
          'Claude would keep the meanings and prepositions as they are, with a note.',
        );
        const proposal = screen.getByRole('region', { name: 'Claude’s meanings' });
        expect(within(proposal).getByText(note)).toBeTruthy();
        expect(within(proposal).queryByRole('checkbox')).toBeNull();
        expect(within(proposal).queryByRole('button', { name: 'Use these' })).toBeNull();
      });
    });

    describe('when the meanings change while Claude answers', () => {
      test('sets the answer aside, saying why', async () => {
        const { reply: verbMeanings, send } = heldReply<VerbMeaningSuggestions>();
        await renderConnectedEditor({ verbMeanings });
        await fillVerb('לשמור', 'לִשְׁמֹר', 'to keep, guard');
        await fireEvent.click(suggestButton());
        await typeInto(input('English meaning'), 'to keep');
        send(lishmorSplit);
        await waitFor(() => expect(status()).toMatch(/changed while Claude was answering/));
        expect(screen.queryByRole('region', { name: 'Claude’s meanings' })).toBeNull();
      });
    });

    describe('when the meanings change after Claude answers', () => {
      test('keeps the answer to read, but not to use', async () => {
        await renderConnectedEditor({ verbMeanings: () => Response.json(lishmorSplit) });
        await fillVerb('לשמור', 'לִשְׁמֹר', 'to keep, guard');
        await clickSuggest();
        await typeInto(input('English meaning'), 'to keep');
        expect(screen.getByText(/The meanings changed since Claude answered/)).toBeTruthy();
        expect(useButton().disabled).toBe(true);
      });
    });

    describe('when the call fails', () => {
      test('says why', async () => {
        await renderConnectedEditor({
          verbMeanings: () =>
            Response.json({ message: 'Claude declined to answer.' }, { status: 502 }),
        });
        await fillVerb('לשמור', 'לִשְׁמֹר', 'to keep, guard');
        await clickSuggest();
        expect(status()).toBe("Couldn't get meanings: Claude declined to answer.");
        expect(suggestButton().disabled).toBe(false);
      });
    });

    describe('before there is a verb', () => {
      test('is disabled, saying why', async () => {
        await renderConnectedEditor();
        await choosePartOfSpeech('Verb');
        expect(suggestButton().disabled).toBe(true);
        expect(status()).toBe('Type the verb first.');
      });
    });
  });
});
