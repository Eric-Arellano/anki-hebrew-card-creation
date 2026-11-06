// The one intake for media. Paste, drop and the file picker differ only in how the files arrive,
// so a new source needs nothing here.
import { encodeImage } from '#lib/media/image.ts';

/** A file ready for Anki, under the name it asks for. */
export type Attachment = { filename: string; blob: Blob };

/** The files on a clipboard. Most copies carry none, and paste as usual. */
export function pastedFiles(clipboard: DataTransfer | null): File[] {
  return [...(clipboard?.items ?? [])]
    .filter((item) => item.kind === 'file')
    .flatMap((item) => item.getAsFile() ?? []);
}

export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

// Sorted out before the images take the rest, which would refuse a recording they can't decode.
// The name counts too, because a file picked or dropped can come with no type.
export function isAudio(file: File): boolean {
  return file.type.startsWith('audio/') || MP3_NAME.test(file.name);
}

const MP3_NAME = /\.mp3$/i;

/**
 * `file` under its own name, or `undefined` unless it is an MP3. Audio is stored as it came, and
 * every recording in the deck, like every Forvo download, is an MP3 that plays wherever Anki does.
 */
export function audioAttachment(file: File): Attachment | undefined {
  if (!MP3_NAME.test(file.name)) return undefined;
  // The media route takes only a lowercase extension.
  return { filename: file.name.replace(MP3_NAME, '.mp3'), blob: file };
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
): Promise<{ encoded: Attachment[]; refusal: string | undefined }> {
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
  images: readonly Attachment[],
  added: readonly Attachment[],
): Attachment[] {
  // One image gets one name, so this catches a second paste, and a clipboard offering two formats.
  return [...images, ...added].filter(
    ({ filename }, index, all) => all.findIndex((image) => image.filename === filename) === index,
  );
}
