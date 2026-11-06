// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { stubImageDecoding } from '#tests/stub-image-decoding.ts';
import { encodeImage, fitWithinLongEdge } from './image.ts';

describe('fitWithinLongEdge', () => {
  test.each([
    ['a wide image', { width: 2000, height: 1000 }, { width: 1000, height: 500 }],
    ['a tall image', { width: 1500, height: 3000 }, { width: 500, height: 1000 }],
    ['an image exactly at the cap', { width: 1000, height: 400 }, { width: 1000, height: 400 }],
    ['a small image, never enlarged', { width: 32, height: 16 }, { width: 32, height: 16 }],
    ['a sliver, keeping a pixel', { width: 5000, height: 1 }, { width: 1000, height: 1 }],
  ])('sizes %s', (_, size, fitted) => {
    expect(fitWithinLongEdge(size)).toEqual(fitted);
  });
});

describe('encodeImage', () => {
  test('names the JPEG after the SHA-1 of its bytes', async () => {
    stubImageDecoding();
    const { filename, blob } = await encodeImage(new Blob(['png']));
    // `printf 'jpeg bytes' | shasum`
    expect(filename).toBe('paste-2ee409c930850cda2ff3a3f17c6e40a3ffa2dd60.jpg');
    expect(blob.type).toBe('image/jpeg');
  });

  test('draws at the capped size over white, so transparency stays light', async () => {
    const { context, canvases } = stubImageDecoding({ width: 2000, height: 1000 });
    await encodeImage(new Blob(['png']));
    expect(canvases.map(({ width, height }) => ({ width, height }))).toEqual([
      { width: 1000, height: 500 },
    ]);
    expect(context.fillStyle).toBe('white');
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(
      context.drawImage.mock.invocationCallOrder[0] ?? 0,
    );
  });

  test('rejects what the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('undecodable')));
    await expect(encodeImage(new Blob(['pdf']))).rejects.toThrow('undecodable');
  });

  test('rejects when the canvas gives no JPEG', async () => {
    stubImageDecoding({ width: 10, height: 10 }, null);
    await expect(encodeImage(new Blob(['png']))).rejects.toThrow('The canvas gave no JPEG');
  });
});
