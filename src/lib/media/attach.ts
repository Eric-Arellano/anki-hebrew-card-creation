// The one intake for images. Paste, drop and the file picker differ only in how the files arrive,
// so a new source needs nothing here.
import { encodeImage, type ImageAttachment } from '#lib/media/image.ts';

/** The files on a clipboard that are images. Most copies carry none, and paste as usual. */
export function pastedImages(clipboard: DataTransfer | null): File[] {
  return [...(clipboard?.items ?? [])]
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .flatMap((item) => item.getAsFile() ?? []);
}

/**
 * The field whose images take a paste or drop at `element`: the `data-image-field` of the block
 * holding it, or `undefined` outside every such block, where the word's `Images` takes it.
 */
export function imageFieldAt(element: EventTarget | null): string | undefined {
  if (!(element instanceof Element)) return undefined;
  return element.closest<HTMLElement>('[data-image-field]')?.dataset.imageField;
}

/** Each of `files` the browser can decode, encoded, and a message naming any it can't. */
export async function encodeImages(
  files: readonly File[],
): Promise<{ encoded: ImageAttachment[]; refusal: string | undefined }> {
  const results = await Promise.allSettled(files.map(encodeImage));
  const refused = files.filter((_, index) => results[index]?.status === 'rejected');
  return {
    encoded: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    refusal:
      refused.length === 0
        ? undefined
        : `Couldn't read ${refused.map((file) => file.name).join(', ')} as an image.`,
  };
}

/** `images` followed by `added`, keeping only the first image under each name. */
export function withAttached(
  images: readonly ImageAttachment[],
  added: readonly ImageAttachment[],
): ImageAttachment[] {
  // One image gets one name, so this catches a second paste, and a clipboard offering two formats.
  return [...images, ...added].filter(
    ({ filename }, index, all) => all.findIndex((image) => image.filename === filename) === index,
  );
}
