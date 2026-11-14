// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { stubImageDecoding } from '#tests/stub-image-decoding.ts';
import {
  addToDeck,
  fillDag,
  mediaRequests,
  noteField,
  renderConnectedEditor,
  skipImage,
} from './CardEditor.harness.ts';

const FILENAME = 'pronunciation_he_דג.mp3';
const mp3 = new File(['mp3 bytes'], FILENAME, { type: 'audio/mpeg' });
const png = new File(['png'], 'image.png', { type: 'image/png' });
const emptyTransfer = { items: [], files: [], types: [] };
const NO_LISTENING_CARD = 'Without audio, this note gets no Listening card.';

beforeEach(() => {
  stubImageDecoding();
  URL.createObjectURL = vi.fn(() => 'blob:recording');
  URL.revokeObjectURL = vi.fn();
});

async function drop(files: File[], target: Element = document.body) {
  await fireEvent.drop(target, { dataTransfer: { ...emptyTransfer, types: ['Files'], files } });
}

function audioWidget() {
  return within(screen.getByRole('group', { name: 'Audio' }));
}

function imagesWidget() {
  return within(screen.getByRole('group', { name: 'Images' }));
}

function player() {
  return screen.queryByLabelText('Recording') as HTMLAudioElement | null;
}

describe('CardEditor', () => {
  describe('attaching audio', () => {
    describe('by dropping', () => {
      test('plays it and names it, and attaches no image', async () => {
        await renderConnectedEditor();
        await drop([mp3]);
        expect(player()?.getAttribute('src')).toBe('blob:recording');
        expect(audioWidget().getByText(FILENAME)).toBeTruthy();
        expect(imagesWidget().queryAllByRole('img')).toEqual([]);
        expect(screen.queryByRole('alert')).toBeNull();
      });

      test('takes it even on a variant prompt', async () => {
        await renderConnectedEditor();
        await fillDag();
        await drop([mp3], noteField('Variant 1: English prompt'));
        expect(player()).not.toBeNull();
      });

      test('sorts the audio from the images in one drop', async () => {
        await renderConnectedEditor();
        await drop([png, mp3]);
        expect(await imagesWidget().findByRole('img')).toBeTruthy();
        expect(player()).not.toBeNull();
      });
    });

    describe('by pasting', () => {
      test('plays it', async () => {
        await renderConnectedEditor();
        await fireEvent.paste(window, {
          clipboardData: { items: [{ kind: 'file', type: mp3.type, getAsFile: () => mp3 }] },
        });
        expect(player()).not.toBeNull();
      });
    });

    describe('by picking', () => {
      test('plays it', async () => {
        await renderConnectedEditor();
        const picker = screen.getByLabelText('Choose file') as HTMLInputElement;
        Object.defineProperty(picker, 'files', { value: [mp3], configurable: true });
        await fireEvent.change(picker);
        expect(player()).not.toBeNull();
      });
    });

    describe('when it is not an MP3', () => {
      test('refuses it, naming the file', async () => {
        await renderConnectedEditor();
        await drop([new File(['ogg'], 'a.ogg', { type: 'audio/ogg' })]);
        expect(audioWidget().getByRole('alert').textContent).toBe(
          "Couldn't attach a.ogg: only MP3 audio is stored.",
        );
        expect(player()).toBeNull();
      });
    });

    describe('when several recordings come at once', () => {
      test('refuses them all', async () => {
        await renderConnectedEditor();
        await drop([mp3, new File(['mp3'], 'other.mp3', { type: 'audio/mpeg' })]);
        expect(audioWidget().getByRole('alert').textContent).toBe(
          'A note holds one recording. Attach just one.',
        );
        expect(player()).toBeNull();
      });
    });
  });

  describe('without audio', () => {
    test('warns that the note gets no Listening card, until it has some', async () => {
      await renderConnectedEditor();
      expect(screen.getByText(NO_LISTENING_CARD)).toBeTruthy();
      await drop([mp3]);
      expect(screen.queryByText(NO_LISTENING_CARD)).toBeNull();
    });

    test('still adds, with Audio blank', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await skipImage();
      expect(await addToDeck(requests)).toMatchObject({ fields: { Audio: '' } });
    });
  });

  describe('removing the audio', () => {
    test('drops it from the note and frees the player', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await skipImage();
      await drop([mp3]);
      await fireEvent.click(screen.getByRole('button', { name: 'Remove audio' }));
      expect(player()).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recording');
      expect(await addToDeck(requests)).toMatchObject({ fields: { Audio: '' } });
      expect(mediaRequests(requests)).toEqual([]);
    });
  });

  describe('adding with audio', () => {
    test('stores its bytes unchanged, then fills Audio with the name Anki used', async () => {
      const stored = 'pronunciation_he_דג-adf6a331.mp3';
      const requests = await renderConnectedEditor({
        storeMedia: () => Response.json({ filename: stored }),
      });
      await fillDag();
      await skipImage();
      await drop([mp3]);

      expect(await addToDeck(requests)).toMatchObject({ fields: { Audio: `[sound:${stored}]` } });
      expect(mediaRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/anki/media',
          body: { filename: FILENAME, data: btoa('mp3 bytes') },
        },
      ]);
    });
  });
});
