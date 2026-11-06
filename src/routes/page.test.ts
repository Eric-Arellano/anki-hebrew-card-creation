// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import {
  fillDag,
  handOff,
  input,
  noteField,
  skipImage,
  stubServer,
  typeInto,
} from '#lib/components/CardEditor.harness.ts';
import Page from './+page.svelte';

async function renderPage() {
  const requests = stubServer();
  render(Page);
  await screen.findByText(/Connected to Anki/);
  return requests;
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
});
