// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import { loadedNote } from '#tests/real-notes.ts';
import {
  choosePartOfSpeech,
  input,
  kelevNote,
  noteField,
  renderConnectedEditor,
} from './CardEditor.harness.ts';

// As the fixture holds it, without a part of speech.
const kelev = loadedNote('כלב');

// Its value sits in a `<bdi>` of its own.
function unofferedText(value: string) {
  const text = `The note has “${value}”, which isn't one of these. Choose one.`;
  return (_: string, element: Element | null) =>
    element?.tagName === 'P' && element.textContent?.trim() === text;
}

describe('CardEditor', () => {
  describe('with a note loaded', () => {
    test('fills the inputs and fields from it', async () => {
      await renderConnectedEditor({}, kelevNote());
      expect(input('Hebrew word, without niqqud').value).toBe('כלב');
      expect(input('English meaning').value).toBe('dog');
      expect(input('Hebrew word, with niqqud').value).toBe('כֶּלֶב');
      expect((screen.getByRole('radio', { name: 'Masculine' }) as HTMLInputElement).checked).toBe(
        true,
      );
      expect(noteField('Variant 1: English prompt').value).toBe('female dog');
    });

    test('shows its stored images and recording', async () => {
      await renderConnectedEditor({}, kelevNote());
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
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Editing כֶּלֶב');
      expect(screen.getByRole('button', { name: 'Start a new word' })).toBeTruthy();
      expect(document.title).toBe('Editing כֶּלֶב · Hebrew card helper');
    });

    test('leaves the focus where it was', async () => {
      await renderConnectedEditor({}, kelev);
      expect(document.activeElement).not.toBe(input('Hebrew word, without niqqud'));
    });

    test('still says what the note lacks', async () => {
      await renderConnectedEditor({}, kelev);
      expect(screen.getByText('Still needed: part of speech')).toBeTruthy();
    });
  });

  describe('with a verb’s meanings', () => {
    const verb = kelevNote({
      'Part of speech': 'verb',
      Definitions:
        '1. to keep <span class="prep"><bdi lang="he">אֶת</bdi></span>' +
        '<br>2. to go<span class="no-prep"></span><br>3. to wait',
    });

    function chosen(meaning: string) {
      const group = screen.getByRole('group', { name: meaning });
      return within(group)
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).checked)
        .map((radio) => radio.parentElement?.textContent?.trim());
    }

    test('chooses each one’s preposition, or None, and leaves one with neither unchosen', async () => {
      await renderConnectedEditor({}, verb);
      expect([chosen('to keep'), chosen('to go'), chosen('to wait')]).toEqual([
        ['אֶת'],
        ['None'],
        [],
      ]);
      expect(screen.getByText('Still needed: preposition, binyan')).toBeTruthy();
    });

    test('marks a changed preposition with what the note held', async () => {
      await renderConnectedEditor({}, verb);
      const group = screen.getByRole('group', { name: 'to keep' });
      await fireEvent.click(within(group).getByRole('radio', { name: 'עַל' }));
      expect(screen.getByRole('button', { name: 'Restore to keep' })).toBeTruthy();
    });
  });

  describe('with a value no chip offers', () => {
    test('names it under the part of speech until one is chosen', async () => {
      await renderConnectedEditor({}, kelevNote({ 'Part of speech': 'Noun' }));
      expect(screen.getByText(unofferedText('Noun'))).toBeTruthy();
      await choosePartOfSpeech('Noun');
      expect(screen.queryByText(unofferedText('Noun'))).toBeNull();
    });

    test('names it under the gender', async () => {
      await renderConnectedEditor({}, kelevNote({ 'Part of speech': 'noun', Gender: 'n' }));
      const gender = screen.getByRole('group', { name: 'Gender' });
      expect(within(gender).getByText(unofferedText('n'))).toBeTruthy();
    });

    test('names it under the binyan', async () => {
      await renderConnectedEditor({}, kelevNote({ 'Part of speech': 'verb', Binyan: 'nitpael' }));
      expect(
        screen.getByRole('combobox', { name: 'Binyan' }).getAttribute('aria-describedby'),
      ).toBe(screen.getByText(unofferedText('nitpael')).id);
    });
  });
});
