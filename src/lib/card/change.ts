// How an input's value differs from what Anki holds, for the marker beside it while editing.

import { type Example, isBlankExample } from '#lib/card/examples.ts';
import { isSamePointedText } from '#lib/hebrew/normalize.ts';
import type { Attachment } from '#lib/media/attach.ts';

export type Change =
  | { kind: 'added' }
  | { kind: 'changed'; was: string }
  | { kind: 'cleared'; was: string };

/** `undefined` while there is nothing held to compare with, or the value reads the same. */
export function textChange(held: string | undefined, now: string): Change | undefined {
  if (held === undefined) return undefined;
  const heldBlank = held.trim() === '';
  const nowBlank = now.trim() === '';
  if (heldBlank && nowBlank) return undefined;
  if (heldBlank) return { kind: 'added' };
  if (nowBlank) return { kind: 'cleared', was: held };
  return isSamePointedText(held, now) ? undefined : { kind: 'changed', was: held };
}

/** As `textChange`, for a list compared item by item, with `describe` writing what it was. */
export function listChange(
  held: readonly string[] | undefined,
  now: readonly string[],
  describe: (values: readonly string[]) => string,
): Change | undefined {
  if (held === undefined) return undefined;
  if (held.length === 0 && now.length === 0) return undefined;
  if (held.length === 0) return { kind: 'added' };
  if (now.length === 0) return { kind: 'cleared', was: describe(held) };
  const same =
    held.length === now.length &&
    held.every((value, index) => isSamePointedText(value, now[index] ?? ''));
  return same ? undefined : { kind: 'changed', was: describe(held) };
}

/** As `listChange`, for the rows of `Examples` that hold anything. */
export function examplesChange(
  was: readonly Example[] | undefined,
  now: readonly Example[],
): Change | undefined {
  return listChange(was && exampleRows(was), exampleRows(now), (rows) => rows.join(' / '));
}

function exampleRows(examples: readonly Example[]): string[] {
  return examples
    .filter((example) => !isBlankExample(example))
    .map(({ hebrew, english }) => `${hebrew.trim()} — ${english.trim()}`);
}

/** As `listChange`, for attachments, which are the same when their filenames are. */
export function attachmentsChange(
  held: readonly Attachment[] | undefined,
  now: readonly Attachment[],
  noun: 'image' | 'recording',
): Change | undefined {
  return listChange(
    held?.map(({ filename }) => filename),
    now.map(({ filename }) => filename),
    ({ length }) => `${length} ${noun}${length === 1 ? '' : 's'}`,
  );
}
