// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { stubImageDecoding } from '#tests/stub-image-decoding.ts';
import {
  addRequests,
  choosePartOfSpeech,
  fillDag,
  handOff,
  input,
  mediaRequests,
  noteField,
  renderConnectedEditor,
  skipImage,
  typeInto,
} from './CardEditor.harness.ts';

// `printf 'jpeg bytes' | shasum`, since the stub's every image encodes to those bytes.
const FILENAME = 'paste-2ee409c930850cda2ff3a3f17c6e40a3ffa2dd60.jpg';
const BASE64 = btoa('jpeg bytes');
const png = new File(['png'], 'image.png', { type: 'image/png' });
const emptyTransfer = { items: [], files: [], types: [] };

beforeEach(() => {
  stubImageDecoding();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

async function pasteImage(target: Element | Window = window) {
  await fireEvent.paste(target, {
    clipboardData: {
      items: [{ kind: 'file', type: png.type, getAsFile: () => png }],
    },
  });
}

function thumbnails() {
  return screen.queryAllByRole('img');
}

function widget(name: string) {
  return screen.getByRole('group', { name });
}

const VARIANT_1 = 'Images for Variant 1: English prompt';

function fileInput() {
  return screen.getByLabelText('Choose files') as HTMLInputElement;
}

describe('CardEditor', () => {
  describe('attaching an image', () => {
    describe('by pasting', () => {
      test('shows it, wherever the focus was', async () => {
        await renderConnectedEditor();
        await pasteImage(input('English meaning'));
        expect((await screen.findByRole('img', { name: 'Attachment 1' })).getAttribute('src')).toBe(
          'blob:preview',
        );
      });

      test('keeps the image out of a text field', async () => {
        await renderConnectedEditor();
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.assign(event, {
          clipboardData: { items: [{ kind: 'file', type: png.type, getAsFile: () => png }] },
        });
        input('English meaning').dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        await screen.findByRole('img');
      });

      test('leaves a paste without an image alone', async () => {
        await renderConnectedEditor();
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.assign(event, {
          clipboardData: { items: [{ kind: 'string', type: 'text/plain' }] },
        });
        input('English meaning').dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      });

      test('keeps one copy of an image pasted twice', async () => {
        await renderConnectedEditor();
        await pasteImage();
        await screen.findByRole('img');
        await pasteImage();
        await new Promise((resolve) => setTimeout(resolve));
        expect(thumbnails()).toHaveLength(1);
      });
    });

    describe('by dropping', () => {
      test('takes a file anywhere on the page', async () => {
        await renderConnectedEditor();
        await fireEvent.drop(document.body, {
          dataTransfer: { ...emptyTransfer, types: ['Files'], files: [png] },
        });
        expect(await screen.findByRole('img')).toBeTruthy();
      });

      test('refuses a drop that carries only a URL', async () => {
        await renderConnectedEditor();
        await fireEvent.drop(document.body, {
          dataTransfer: { ...emptyTransfer, types: ['text/uri-list'] },
        });
        expect(screen.getByRole('alert').textContent).toContain('Copy the image');
        expect(thumbnails()).toEqual([]);
      });

      test('leaves a link dropped on a text field to the field', async () => {
        await renderConnectedEditor();
        const event = new Event('drop', { bubbles: true, cancelable: true });
        Object.assign(event, {
          dataTransfer: { ...emptyTransfer, types: ['text/uri-list', 'text/plain'] },
        });
        input('English meaning').dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(screen.queryByRole('alert')).toBeNull();
      });

      test('marks the drop zone while a file is over the page', async () => {
        await renderConnectedEditor();
        const zone = fileInput().closest('.border-dashed') as HTMLElement;
        await fireEvent.dragOver(document.body, {
          dataTransfer: { ...emptyTransfer, types: ['Files'] },
        });
        expect(zone.className).toContain('border-blue-600');
        // A real `relatedTarget`, since `fireEvent` leaves it undefined rather than null.
        await fireEvent(document.body, new MouseEvent('dragleave', { bubbles: true }));
        expect(zone.className).not.toContain('border-blue-600');
      });
    });

    describe('by picking', () => {
      test('resets the input, so the same file can be picked again', async () => {
        await renderConnectedEditor();
        const picker = fileInput();
        Object.defineProperty(picker, 'files', { value: [png], configurable: true });
        const reset = vi.spyOn(picker, 'value', 'set');
        await fireEvent.change(picker);
        await screen.findByRole('img');
        expect(reset).toHaveBeenCalledWith('');
      });
    });

    describe('when the browser cannot decode the file', () => {
      test('says which file, and attaches the rest', async () => {
        await renderConnectedEditor();
        vi.stubGlobal('createImageBitmap', async (file: File) => {
          if (file.name === 'notes.pdf') throw new Error('undecodable');
          return { width: 10, height: 10, close: () => {} };
        });
        const pdf = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });
        await fireEvent.drop(document.body, {
          dataTransfer: { ...emptyTransfer, types: ['Files'], files: [pdf, png] },
        });
        expect((await screen.findByRole('alert')).textContent).toBe(
          "Couldn't read notes.pdf as an image.",
        );
        expect(thumbnails()).toHaveLength(1);
      });
    });
  });

  describe('without an image', () => {
    async function renderFilledEditor() {
      const requests = await renderConnectedEditor();
      await fillDag();
      return requests;
    }

    function openButton() {
      return screen.getByRole('button', { name: 'Open in Anki' }) as HTMLButtonElement;
    }

    test('blocks the hand-off and says an image is still needed', async () => {
      await renderFilledEditor();
      expect(openButton().disabled).toBe(true);
      expect(screen.getByText('Still needed: image')).toBeTruthy();
    });

    test('lists the image after the inputs still blank', async () => {
      await renderConnectedEditor();
      expect(
        screen.getByText(
          'Still needed: Hebrew word without niqqud, English meaning, part of speech, ' +
            'Hebrew word with niqqud, image',
        ),
      ).toBeTruthy();
    });

    test('hands off once the human says the word has none', async () => {
      const requests = await renderFilledEditor();
      await skipImage();
      expect(screen.queryByText(/Still needed/)).toBeNull();
      expect(await handOff(requests)).toMatchObject({ fields: { Images: '' } });
    });

    test('hands off once an image is attached, and drops the checkbox', async () => {
      const requests = await renderFilledEditor();
      await pasteImage();
      await screen.findByRole('img');
      expect(screen.queryByRole('checkbox', { name: 'No image for this word' })).toBeNull();
      expect(openButton().disabled).toBe(false);
      await handOff(requests);
      expect(mediaRequests(requests)).toHaveLength(1);
    });

    describe('after removing the only image', () => {
      test('is needed again', async () => {
        await renderFilledEditor();
        await pasteImage();
        await screen.findByRole('img');
        await fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }));
        expect(screen.getByText('Still needed: image')).toBeTruthy();
      });
    });
  });

  describe('removing an image', () => {
    test('drops it from the hand-off and frees its preview', async () => {
      const requests = await renderConnectedEditor();
      await fillDag();
      await pasteImage();
      await screen.findByRole('img');

      await fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }));
      expect(thumbnails()).toEqual([]);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');

      await skipImage();
      expect(await handOff(requests)).toMatchObject({ fields: { Images: '' } });
      expect(mediaRequests(requests)).toEqual([]);
    });
  });

  describe('handing off with an image', () => {
    test('stores it, then fills Images with the name Anki used', async () => {
      const stored = 'paste-2ee409c9-1.jpg';
      const requests = await renderConnectedEditor({
        storeMedia: () => Response.json({ filename: stored }),
      });
      await fillDag();
      await pasteImage();
      await screen.findByRole('img');

      expect(mediaRequests(requests)).toEqual([]);
      expect(await handOff(requests)).toMatchObject({
        fields: { Images: `<div><img src="${stored}"></div>` },
      });
      expect(mediaRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/anki/media',
          body: { filename: FILENAME, data: BASE64 },
        },
      ]);
      expect(requests.at(-1)?.path).toBe('/api/anki/add');
    });

    describe('when storing fails', () => {
      test('says so and never opens the Add window', async () => {
        const requests = await renderConnectedEditor({
          storeMedia: () =>
            Response.json({ message: 'collection is not available' }, { status: 502 }),
        });
        await fillDag();
        await pasteImage();
        await screen.findByRole('img');

        await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
        await waitFor(() =>
          expect(screen.getByRole('alert').textContent).toBe(
            'Add window not opened: storing an image failed. collection is not available',
          ),
        );
        expect(addRequests(requests)).toEqual([]);
      });
    });
  });

  describe('attaching an image to a variant prompt', () => {
    async function renderWithVariants() {
      const requests = await renderConnectedEditor();
      await fillDag();
      return requests;
    }

    test('takes a paste while the focus is in the prompt', async () => {
      await renderWithVariants();
      noteField('Variant 1: English prompt').focus();
      await pasteImage(noteField('Variant 1: English prompt'));
      expect(await within(widget(VARIANT_1)).findByRole('img')).toBeTruthy();
      expect(within(widget('Images')).queryAllByRole('img')).toEqual([]);
    });

    test('takes a paste after a click anywhere in its block', async () => {
      await renderWithVariants();
      const block = noteField('Variant 1: English prompt').closest('[data-image-target]');
      (block as HTMLElement).focus();
      await pasteImage(document.body);
      expect(await within(widget(VARIANT_1)).findByRole('img')).toBeTruthy();
    });

    test('leaves a paste from anywhere else to Images', async () => {
      await renderWithVariants();
      noteField('Notes').focus();
      await pasteImage(noteField('Notes'));
      expect(await within(widget('Images')).findByRole('img')).toBeTruthy();
      expect(within(widget(VARIANT_1)).queryAllByRole('img')).toEqual([]);
    });

    test('says which widget a paste will go to', async () => {
      await renderWithVariants();
      expect(within(widget('Images')).queryByText('pastes here')).toBeTruthy();
      noteField('Variant 1: English prompt').focus();
      await waitFor(() =>
        expect(within(widget(VARIANT_1)).queryByText('pastes here')).toBeTruthy(),
      );
      expect(within(widget('Images')).queryByText('pastes here')).toBeNull();
    });

    test('takes a file dropped on the prompt', async () => {
      await renderWithVariants();
      await fireEvent.drop(noteField('Variant 1: English prompt'), {
        dataTransfer: { ...emptyTransfer, types: ['Files'], files: [png] },
      });
      expect(await within(widget(VARIANT_1)).findByRole('img')).toBeTruthy();
      expect(within(widget('Images')).queryAllByRole('img')).toEqual([]);
    });

    describe('without an answer', () => {
      test('warns that no card shows the image, until there is one', async () => {
        await renderWithVariants();
        noteField('Variant 1: English prompt').focus();
        await pasteImage();
        await within(widget(VARIANT_1)).findByRole('img');
        const warning = /No card shows these images/;
        expect(screen.getByText(warning)).toBeTruthy();
        await typeInto(noteField('Variant 1: Hebrew answer, with niqqud'), 'דָּגָה');
        expect(screen.queryByText(warning)).toBeNull();
      });
    });

    describe('handing off', () => {
      test('stores it, then puts it after the prompt under the name Anki used', async () => {
        const stored = 'paste-2ee409c9-1.jpg';
        const requests = await renderConnectedEditor({
          storeMedia: () => Response.json({ filename: stored }),
        });
        await fillDag();
        await skipImage();
        await typeInto(noteField('Variant 1: English prompt'), 'female fish');
        noteField('Variant 1: English prompt').focus();
        await pasteImage();
        await within(widget(VARIANT_1)).findByRole('img');

        expect(await handOff(requests)).toMatchObject({
          fields: { 'Variant 1 prompt': `female fish<div><img src="${stored}"></div>` },
        });
        expect(mediaRequests(requests)).toEqual([
          { method: 'POST', path: '/api/anki/media', body: { filename: FILENAME, data: BASE64 } },
        ]);
      });

      describe('after switching to a part of speech without variants', () => {
        test('neither stores the image nor sends it', async () => {
          const requests = await renderWithVariants();
          await skipImage();
          noteField('Variant 1: English prompt').focus();
          await pasteImage();
          await within(widget(VARIANT_1)).findByRole('img');

          await choosePartOfSpeech('Adverb');
          expect(await handOff(requests)).toMatchObject({ fields: { 'Variant 1 prompt': '' } });
          expect(mediaRequests(requests)).toEqual([]);
        });

        test('keeps the image for switching back', async () => {
          await renderWithVariants();
          noteField('Variant 1: English prompt').focus();
          await pasteImage();
          await within(widget(VARIANT_1)).findByRole('img');

          await choosePartOfSpeech('Adverb');
          await choosePartOfSpeech('Other');
          expect(within(widget(VARIANT_1)).getAllByRole('img')).toHaveLength(1);
        });
      });
    });
  });
});
