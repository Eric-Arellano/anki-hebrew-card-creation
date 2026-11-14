// Media syncs to the phone, and Copy Image tends to hand over a PNG whatever the original was, so
// every image is re-encoded here before it reaches the media folder.
import type { NewAttachment } from '#lib/media/attach.ts';

const LONG_EDGE = 1000;
const JPEG_QUALITY = 0.85;

export type Size = { width: number; height: number };

/** `size` scaled down so its long edge fits, keeping its shape. A smaller image stays as it is. */
export function fitWithinLongEdge({ width, height }: Size, longEdge = LONG_EDGE): Size {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  // A sliver rounding to 0 would make a canvas that can't encode.
  function scaled(edge: number) {
    return Math.max(1, Math.round(edge * scale));
  }
  return { width: scaled(width), height: scaled(height) };
}

async function hexSha1(blob: Blob): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', await blob.arrayBuffer()));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('The canvas gave no JPEG')) : resolve(blob)),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * `file` as a JPEG named as Anki names a paste, so one image always gets one name. Rejects when the
 * browser can't decode it, which is also how anything that isn't an image gets refused.
 */
export async function encodeImage(file: Blob): Promise<NewAttachment> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  Object.assign(canvas, fitWithinLongEdge(bitmap));

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no canvas to draw on');
  // JPEG has no alpha, so transparent clip art would otherwise turn black.
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await canvasToJpeg(canvas);
  return { kind: 'new', filename: `paste-${await hexSha1(blob)}.jpg`, blob };
}
