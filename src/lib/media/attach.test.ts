// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { stubImageDecoding } from '#tests/stub-image-decoding.ts';
import { encodeImages, imageTargetAt, pastedImages, withAttached } from './attach.ts';

const png = new File(['png'], 'image.png', { type: 'image/png' });
const pdf = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });

describe('pastedImages', () => {
  function clipboard(...items: Partial<DataTransferItem>[]) {
    return { items } as unknown as DataTransfer;
  }

  test('takes the image from what a copied image carries beside it', () => {
    expect(
      pastedImages(
        clipboard(
          { kind: 'string', type: 'text/html' },
          { kind: 'file', type: 'image/png', getAsFile: () => png },
        ),
      ),
    ).toEqual([png]);
  });

  test.each([
    ['text', clipboard({ kind: 'string', type: 'text/plain' })],
    ['a file that is no image', clipboard({ kind: 'file', type: pdf.type, getAsFile: () => pdf })],
    ['an image with no file', clipboard({ kind: 'file', type: png.type, getAsFile: () => null })],
    ['nothing', null],
  ])('finds nothing in %s', (_, data) => {
    expect(pastedImages(data)).toEqual([]);
  });
});

describe('imageTargetAt', () => {
  function page() {
    document.body.innerHTML =
      '<p id="outside"></p><div data-image-target="variant1Prompt"><p><b id="inside"></b></p></div>';
  }

  test('names the region holding the element, however deep', () => {
    page();
    expect(imageTargetAt(document.getElementById('inside'))).toBe('variant1Prompt');
  });

  test.each([
    ['an element outside every region', () => document.getElementById('outside')],
    ['the window', () => window],
    ['nothing', () => null],
  ])('names nothing for %s', (_, element) => {
    page();
    expect(imageTargetAt(element())).toBeUndefined();
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
