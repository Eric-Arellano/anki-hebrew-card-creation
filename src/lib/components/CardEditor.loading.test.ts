// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { LoadedNote } from '#lib/api/anki.ts';
import { loadedNote } from '#tests/real-notes.ts';
import {
  choosePartOfSpeech,
  input,
  noteField,
  renderConnectedEditor,
  typeInto,
} from './CardEditor.harness.ts';

const kelev = loadedNote('כלב');

function withFields(note: LoadedNote, fields: Record<string, string>): LoadedNote {
  return { ...note, fields: { ...note.fields, ...fields } };
}

// Its value sits in a `<bdi>` of its own.
function unofferedText(value: string) {
  const text = `The note has “${value}”, which isn't one of these. Choose one.`;
  return (_: string, element: Element | null) =>
    element?.tagName === 'P' && element.textContent?.trim() === text;
}

describe('CardEditor', () => {
  describe('with a note loaded', () => {
    test('fills the inputs and fields from it', async () => {
      await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'noun' }));
      expect(input('Hebrew word, without niqqud').value).toBe('כלב');
      expect(input('English meaning').value).toBe('dog');
      expect(input('Hebrew word, with niqqud').value).toBe('כֶּלֶב');
      expect((screen.getByRole('radio', { name: 'Masculine' }) as HTMLInputElement).checked).toBe(
        true,
      );
      expect(noteField('Variant 1: English prompt').value).toBe('female dog');
    });

    test('shows its stored images and recording', async () => {
      await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'noun' }));
      const sources = screen.getAllByRole('img').map((image) => image.getAttribute('src'));
      expect(sources.map((source) => decodeURIComponent(source ?? ''))).toEqual([
        '/api/anki/media/image-48258e0538aecfb7c668bfea2657cf398428fd72.jpg',
        '/api/anki/media/shutterstock_628340135-cute-siberian-husky-puppy-with-flowers-on-a-pink-background-background-1.jpg',
      ]);
      expect(decodeURIComponent(document.querySelector('audio')?.getAttribute('src') ?? '')).toBe(
        '/api/anki/media/pronunciation_he_כלב.mp3',
      );
    });

    test('says which note it edits', async () => {
      await renderConnectedEditor({}, kelev);
      const banner = screen.getByRole('region', { name: 'Editing' });
      expect(banner.textContent).toContain('כֶּלֶב');
      expect(within(banner).getByRole('button', { name: 'New word' })).toBeTruthy();
    });

    test('still says what the note lacks', async () => {
      await renderConnectedEditor({}, kelev);
      expect(screen.getByText('Still needed: part of speech')).toBeTruthy();
    });

    describe('in the deck check', () => {
      test('leaves the note out', async () => {
        await renderConnectedEditor(
          {
            existing: {
              exactMatches: [
                {
                  noteId: kelev.noteId,
                  unpointed: 'כלב',
                  pointed: 'כֶּלֶב',
                  partOfSpeech: '',
                  definitions: '',
                },
              ],
              sameRootMatches: [],
              relatedMatches: [
                {
                  noteId: 1,
                  unpointed: 'כלבה',
                  pointed: 'כַּלְבָּה',
                  partOfSpeech: '',
                  definitions: '',
                },
              ],
            },
          },
          kelev,
        );
        const check = screen.getByRole('region', { name: 'Already in the deck' });
        expect(await within(check).findByText('Related notes in your deck')).toBeTruthy();
        expect(
          within(check)
            .getAllByRole('listitem')
            .map((item) => within(item).getByText('כַּלְבָּה')),
        ).toHaveLength(1);
      });

      describe('when it finds only the note', () => {
        test('says nothing, rather than that the word is not in the deck', async () => {
          await renderConnectedEditor(
            {
              existing: {
                exactMatches: [
                  {
                    noteId: kelev.noteId,
                    unpointed: 'כלב',
                    pointed: 'כֶּלֶב',
                    partOfSpeech: '',
                    definitions: '',
                  },
                ],
                sameRootMatches: [],
                relatedMatches: [],
              },
            },
            kelev,
          );
          const check = screen.getByRole('region', { name: 'Already in the deck' });
          await waitFor(() => expect(check.textContent?.trim()).toBe(''));
        });
      });
    });
  });

  describe('with a value no chip offers', () => {
    test('names it under the part of speech until one is chosen', async () => {
      await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'Noun' }));
      expect(screen.getByText(unofferedText('Noun'))).toBeTruthy();
      await choosePartOfSpeech('Noun');
      expect(screen.queryByText(unofferedText('Noun'))).toBeNull();
    });

    test('names it under the gender', async () => {
      await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'noun', Gender: 'n' }));
      const gender = screen.getByRole('group', { name: 'Gender' });
      expect(within(gender).getByText(unofferedText('n'))).toBeTruthy();
    });

    test('names it under the binyan', async () => {
      await renderConnectedEditor(
        {},
        withFields(kelev, { 'Part of speech': 'verb', Binyan: 'nitpael' }),
      );
      expect(
        screen.getByRole('combobox', { name: 'Binyan' }).getAttribute('aria-describedby'),
      ).toBe(screen.getByText(unofferedText('nitpael')).id);
    });

    test("names it under a verb's preposition", async () => {
      await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'verb' }));
      const preposition = screen.getByRole('group', { name: 'Preposition it takes (מילת יחס)' });
      expect(within(preposition).getByText(unofferedText('טוב'))).toBeTruthy();
    });

    describe('for an input another part of speech shows', () => {
      test('names nothing', async () => {
        await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'noun' }));
        expect(screen.queryByText(unofferedText('טוב'))).toBeNull();
      });
    });
  });

  describe('the pointed word', () => {
    describe('when it holds more than the word', () => {
      test('warns', async () => {
        await renderConnectedEditor(
          {},
          withFields(loadedNote('בית'), { 'Part of speech': 'noun' }),
        );
        expect(input('Hebrew word, with niqqud').value).toBe('(ms) בַּיִת (mp)\u00a0בָּתִּים');
        expect(screen.getByText(/Doesn't spell/).textContent?.trim()).toBe(
          "Doesn't spell בית, the word without niqqud.",
        );
      });
    });

    describe('when it spells the word', () => {
      test('says nothing', async () => {
        await renderConnectedEditor({}, withFields(kelev, { 'Part of speech': 'noun' }));
        expect(screen.queryByText(/Doesn't spell/)).toBeNull();
      });
    });

    describe('when a new note is mistyped', () => {
      test('warns', async () => {
        await renderConnectedEditor();
        await typeInto(input('Hebrew word, without niqqud'), 'דג');
        await choosePartOfSpeech('Other');
        await typeInto(input('Hebrew word, with niqqud'), 'דָּד');
        expect(screen.getByText(/Doesn't spell/)).toBeTruthy();
      });
    });
  });
});
