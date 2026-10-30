// Converts what Wiktionary writes into the values the editor's inputs take. Anything without a
// sure counterpart converts to nothing, so the input stays blank rather than guessed.
import type { DictionaryNoun } from '#lib/api/dictionary.ts';
import { toLookupKey } from '#lib/hebrew/normalize.ts';
import { PREPOSITIONS, type Preposition } from '#lib/hebrew/preposition.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';

export function partOfSpeechOf(pos: string): PartOfSpeech {
  return pos === 'noun' || pos === 'verb' ? pos : 'other';
}

// Gender codes are `m` or `f`, with `-p` for a noun only ever plural (`מוניטין`), `-d` for one only
// dual (`משקפיים`) and `-s` for one only singular. A noun of both genders has a second code, or the
// rarer `mf`. Anything else (`p`, `?`, blank) is unknown.
const GENDER_CODE = /^([mf])(?:-([pds]))?$/;

/** The gender of a noun whose head template gives `codes`. */
export function nounGender(codes: readonly string[]): DictionaryNoun['gender'] {
  const parsed = codes
    .flatMap((code) => (code === 'mf' ? ['m', 'f'] : [code]))
    .map((code) => {
      const match = GENDER_CODE.exec(code);
      return match && { gender: match[1], pluralOnly: match[2] === 'p' || match[2] === 'd' };
    });
  if (parsed.length === 0 || parsed.some((code) => code === null)) return undefined;
  const genders = new Set(parsed.map((code) => code?.gender));
  const pluralOnly = new Set(parsed.map((code) => code?.pluralOnly));
  // Masculine in the singular and feminine only in the plural is too odd to enter as one.
  if (pluralOnly.size > 1) return undefined;
  return {
    gender: genders.size > 1 ? 'mf' : genders.has('f') ? 'f' : 'm',
    pluralOnly: pluralOnly.has(true),
  };
}

/**
 * The preposition a gloss's `[with לְ־ ‘for’]` names. Wiktionary spells one pointed or not, with
 * or without a maqaf, and a direct object as `אֵת` or `direct`.
 */
export function governedPreposition(text: string): Preposition | undefined {
  if (text === 'direct') return 'את';
  const key = toLookupKey(text);
  return PREPOSITIONS.find((preposition) => preposition === key);
}
