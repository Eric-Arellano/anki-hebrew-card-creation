// How an input's value differs from what Anki holds, for the marker beside it while editing.

import { isSamePointedText } from '#lib/hebrew/normalize.ts';
import type { Attachment } from '#lib/media/attach.ts';

// What Anki holds while a note is being edited, which each change is marked against, and
// `undefined` for a new word, which has nothing to mark.
export type Held<T> = T | undefined;

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

/**
 * Each row Anki holds past the end of `now`, with its index there, leaving out blank ones. A row
 * still in `now` is marked where it is, field by field, against the row at its index.
 */
export function removedRows<T>(
  held: readonly T[] | undefined,
  now: readonly unknown[],
  isBlank: (row: T) => boolean,
): { index: number; row: T }[] {
  return (held ?? [])
    .map((row, index) => ({ index, row }))
    .slice(now.length)
    .filter(({ row }) => !isBlank(row));
}

/**
 * `now` with the held rows past its end put back, up to and including the one at `index`, so that
 * one lands back at its own index. `copy` keeps an edit to a restored row off the held one.
 */
export function restoredThrough<T>(
  now: readonly T[],
  held: readonly T[] | undefined,
  index: number,
  copy: (row: T) => T = (row) => row,
): T[] {
  return [...now, ...(held ?? []).slice(now.length, index + 1).map(copy)];
}

// The last row is cleared rather than removed, so there is always one to type in.
export function withoutRow<T>(now: readonly T[], index: number, blank: () => T): T[] {
  return now.length === 1 ? [blank()] : now.toSpliced(index, 1);
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
