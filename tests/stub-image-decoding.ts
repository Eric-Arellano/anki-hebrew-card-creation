import { vi } from 'vitest';

/** Stands in for `createImageBitmap` and canvas, which jsdom lacks. */
export function stubImageDecoding(
  { width, height } = { width: 10, height: 10 },
  jpeg: Blob | null = new Blob(['jpeg bytes'], { type: 'image/jpeg' }),
) {
  const context = {
    fillStyle: '',
    imageSmoothingQuality: 'low',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvases: HTMLCanvasElement[] = [];

  vi.stubGlobal('createImageBitmap', async () => ({ width, height, close: () => {} }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    canvases.push(this);
    return context as never;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(jpeg));

  return { context, canvases };
}
