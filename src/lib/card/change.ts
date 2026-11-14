// How an input's value differs from what Anki holds, for the marker beside it while editing.

import { isSamePointedText } from '#lib/hebrew/normalize.ts';

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
