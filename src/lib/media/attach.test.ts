// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { stubImageDecoding } from '#tests/stub-image-decoding.ts';
import {
  audioAttachment,
  encodeImages,
  imageFieldAt,
  isAudio,
  pastedFiles,
  withAttached,
} from './attach.ts';

const png = new File(['png'], 'image.png', { type: 'image/png' });
const pdf = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });

describe('pastedFiles', () => {
  function clipboard(...items: Partial<DataTransferItem>[]) {
    return { items } as unknown as DataTransfer;
  }

  test('takes the file from what a copied image carries beside it', () => {
    expect(
      pastedFiles(
        clipboard(
          { kind: 'string', type: 'text/html' },
          { kind: 'file', type: 'image/png', getAsFile: () => png },
        ),
      ),
    ).toEqual([png]);
  });

  test.each([
    ['text', clipboard({ kind: 'string', type: 'text/plain' })],
    [
      'a file item with no file',
      clipboard({ kind: 'file', type: png.type, getAsFile: () => null }),
    ],
    ['nothing', null],
  ])('finds nothing in %s', (_, data) => {
    expect(pastedFiles(data)).toEqual([]);
  });
});

describe('isAudio', () => {
  test.each([
    ['an MP3', new File(['mp3'], 'a.mp3', { type: 'audio/mpeg' })],
    ['an MP3 with no type', new File(['mp3'], 'a.MP3')],
    ['audio of another format', new File(['ogg'], 'a.ogg', { type: 'audio/ogg' })],
  ])('takes %s', (_, file) => {
    expect(isAudio(file)).toBe(true);
  });

  test.each([
    ['an image', png],
    ['a PDF', pdf],
  ])('leaves %s to the images', (_, file) => {
    expect(isAudio(file)).toBe(false);
  });
});

describe('audioAttachment', () => {
  test('keeps the name and the bytes as they came', () => {
    const file = new File(['mp3'], 'pronunciation_he_בית.mp3', { type: 'audio/mpeg' });
    expect(audioAttachment(file)).toEqual({ filename: 'pronunciation_he_בית.mp3', blob: file });
  });

  test('lowercases the extension, which the media route needs', () => {
    expect(audioAttachment(new File(['mp3'], 'a.MP3'))?.filename).toBe('a.mp3');
  });

  test('refuses another format', () => {
    expect(audioAttachment(new File(['ogg'], 'a.ogg', { type: 'audio/ogg' }))).toBeUndefined();
  });
});

describe('imageFieldAt', () => {
  function page() {
    document.body.innerHTML =
      '<p id="outside"></p><div data-image-field="variant1Prompt"><p><b id="inside"></b></p></div>';
  }

  test('names the field of the block holding the element, however deep', () => {
    page();
    expect(imageFieldAt(document.getElementById('inside'))).toBe('variant1Prompt');
  });

  test.each([
    ['an element outside every block', () => document.getElementById('outside')],
    ['the window', () => window],
    ['nothing', () => null],
  ])('names nothing for %s', (_, element) => {
    page();
    expect(imageFieldAt(element())).toBeUndefined();
  });
});

describe('encodeImages', () => {
  test('encodes every file, refusing none', async () => {
    stubImageDecoding();
    const { encoded, refusal } = await encodeImages([png, png]);
    expect(encoded).toHaveLength(2);
    expect(refusal).toBeUndefined();
  });

  describe('when the browser cannot decode a file', () => {
    test('names it, and encodes the rest', async () => {
      stubImageDecoding();
      vi.stubGlobal('createImageBitmap', async (file: File) => {
        if (file === pdf) throw new Error('undecodable');
        return { width: 10, height: 10, close: () => {} };
      });
      const { encoded, refusal } = await encodeImages([pdf, png]);
      expect(encoded).toHaveLength(1);
      expect(refusal).toBe("Couldn't read notes.pdf as an image.");
    });
  });
});

describe('withAttached', () => {
  const first = { filename: 'paste-a.jpg', blob: new Blob(['a']) };
  const second = { filename: 'paste-b.jpg', blob: new Blob(['b']) };

  test('adds after what is attached', () => {
    expect(withAttached([first], [second])).toEqual([first, second]);
  });

  test('keeps the first image under a name it already has', () => {
    const repeat = { filename: 'paste-a.jpg', blob: new Blob(['a again']) };
    expect(withAttached([first], [repeat, second, second])).toEqual([first, second]);
  });
});
