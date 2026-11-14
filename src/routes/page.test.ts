// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import {
  fillDag,
  handOff,
  input,
  noteField,
  type ServerReplies,
  skipImage,
  stubServer,
  typeInto,
} from '#lib/components/CardEditor.harness.ts';
import { loadedNote } from '#tests/real-notes.ts';
import Page from './+page.svelte';

async function renderPage(replies: Omit<ServerReplies, 'status'> = {}) {
  const requests = stubServer(replies);
  render(Page);
  await screen.findByText(/Connected to Anki/);
  return requests;
}

const kelev = loadedNote('כלב');

// The deck check finds כלב, and Anki holds it.
async function renderPageFindingKelev() {
  const requests = await renderPage({
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
      relatedMatches: [],
    },
    notes: [kelev],
  });
  await typeInto(input('Hebrew word, without niqqud'), 'כלב');
  return requests;
}

async function clickFoundNote() {
  const check = screen.getByRole('region', { name: 'Already in the deck' });
  await fireEvent.click(await within(check).findByRole('button', { name: /כֶּלֶב/ }));
}

describe('the page', () => {
  describe('before anything is handed off', () => {
    test('offers no next word, and starts in the word input', async () => {
      await renderPage();
      expect(screen.queryByRole('button', { name: 'Next word' })).toBeNull();
      expect(document.activeElement).toBe(input('Hebrew word, without niqqud'));
    });
  });

  describe('after a hand-off', () => {
    async function handOffNote() {
      const requests = await renderPage();
      await fillDag();
      await typeInto(noteField('Notes'), 'freshwater');
      await skipImage();
      await handOff(requests);
    }

    test('keeps the note, in case it needs fixing and opening again', async () => {
      await handOffNote();
      expect(input('Hebrew word, without niqqud').value).toBe('דג');
      expect(noteField('Notes').value).toBe('freshwater');
    });

    test('focuses Next word, so Enter is all it takes', async () => {
      await handOffNote();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next word' }));
    });

    describe('on Next word', () => {
      test('starts over with every input blank and the word focused', async () => {
        await handOffNote();
        await fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
        await screen.findByText(/Connected to Anki/);

        expect(input('Hebrew word, without niqqud').value).toBe('');
        expect(input('English meaning').value).toBe('');
        expect(screen.queryByLabelText('Notes')).toBeNull();
        expect(screen.queryByText(/Opened in Anki/)).toBeNull();
        expect(document.activeElement).toBe(input('Hebrew word, without niqqud'));
      });

      test('asks for an image again, rather than keeping the last tick', async () => {
        await handOffNote();
        await fireEvent.click(screen.getByRole('button', { name: 'Next word' }));
        await screen.findByText(/Connected to Anki/);

        const noImage = screen.getByRole('checkbox', { name: 'No image for this word' });
        expect((noImage as HTMLInputElement).checked).toBe(false);
        expect(screen.getByText(/Still needed: .*, image$/)).toBeTruthy();
      });
    });
  });

  describe('on clicking a note in the deck check', () => {
    test('opens it in the editor', async () => {
      await renderPageFindingKelev();
      await clickFoundNote();
      expect(await screen.findByRole('region', { name: 'Editing' })).toBeTruthy();
      expect(input('English meaning').value).toBe('dog');
      expect(input('Hebrew word, with niqqud').value).toBe('כֶּלֶב');
    });

    describe('after typing more than the word', () => {
      async function typeAndClick() {
        await renderPageFindingKelev();
        await typeInto(input('English meaning'), 'hound');
        await clickFoundNote();
      }

      test('asks before replacing the draft', async () => {
        await typeAndClick();
        expect(screen.getByRole('alert').textContent).toContain("replaces what you've typed");
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Replace and edit' }),
        );
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and edit' }));
        expect(await screen.findByRole('region', { name: 'Editing' })).toBeTruthy();
        expect(input('English meaning').value).toBe('dog');
      });

      test('keeps the draft when cancelled', async () => {
        await typeAndClick();
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('region', { name: 'Editing' })).toBeNull();
        expect(input('English meaning').value).toBe('hound');
      });
    });

    describe('when Anki no longer has the note', () => {
      test('says so, and keeps the draft', async () => {
        await renderPage({
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
            relatedMatches: [],
          },
        });
        await typeInto(input('Hebrew word, without niqqud'), 'כלב');
        await clickFoundNote();
        expect((await screen.findByRole('alert')).textContent).toBe('Anki has no Hebrew note');
        expect(screen.queryByRole('region', { name: 'Editing' })).toBeNull();
      });
    });
  });

  describe('on New word while editing', () => {
    test('starts a new note with every input blank', async () => {
      await renderPageFindingKelev();
      await clickFoundNote();
      const banner = await screen.findByRole('region', { name: 'Editing' });
      await fireEvent.click(within(banner).getByRole('button', { name: 'New word' }));
      await screen.findByText(/Connected to Anki/);

      expect(screen.queryByRole('region', { name: 'Editing' })).toBeNull();
      expect(input('Hebrew word, without niqqud').value).toBe('');
      expect(input('English meaning').value).toBe('');
    });
  });
});
