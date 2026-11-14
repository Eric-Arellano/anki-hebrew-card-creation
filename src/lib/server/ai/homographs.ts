// The other words a note's spelling could be read as without niqqud, which both the suggestions
// and the check tell Claude about, so a Reading context can be judged against them.
import { error } from '@sveltejs/kit';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import { isSamePointedText, toLookupKey } from '#lib/hebrew/normalize.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';
import type { DictionaryPaths } from '#lib/server/dictionary/files.ts';
import {
  DictionaryUnavailableError,
  lookUp,
  withDictionary,
} from '#lib/server/dictionary/lookup.ts';

export type Homograph = { pointed: string; partOfSpeech: PartOfSpeech; definitions: string[] };

/**
 * The other words `word` could be read as without niqqud: the entries titled with its spelling
 * whose pointing isn't `pointed`. None when `pointed` is blank, since then nothing tells the
 * note's own entry apart.
 */
export function homographsOf(lookup: DictionaryLookup, word: string, pointed: string): Homograph[] {
  if (lookup.match !== 'exact' || pointed.trim() === '') return [];
  // A lemma the lookup reached through one of its forms isn't a reading of this spelling: `כלב`
  // finds `כַּלְבָּה` through its masculine, and `לדבר` finds `דִּבֵּר`, the verb's own entry.
  const key = toLookupKey(word);
  return lookup.candidates.flatMap((candidate) =>
    candidate.pointed !== undefined &&
    toLookupKey(candidate.title) === key &&
    !isSamePointedText(candidate.pointed, pointed)
      ? [
          {
            pointed: candidate.pointed,
            partOfSpeech: candidate.partOfSpeech,
            definitions: candidate.definitions,
          },
        ]
      : [],
  );
}

/** `word`'s homographs, looked up in the dictionary, or a 503 when there's no index. */
export function lookUpHomographs(
  paths: DictionaryPaths,
  word: string,
  pointed: string,
): Homograph[] {
  try {
    return withDictionary(paths, (db, staleIndex) =>
      homographsOf(lookUp(db, word, staleIndex), word, pointed),
    );
  } catch (cause) {
    if (cause instanceof DictionaryUnavailableError) error(503, cause.message);
    throw cause;
  }
}

/** `homographs` as a prompt lists them, under what the note's spelling could also be. */
export function homographLines(homographs: readonly Homograph[]): string {
  return [
    'Without niqqud, its spelling could also be:',
    ...homographs.map(
      ({ pointed, partOfSpeech, definitions }) =>
        `- ${pointed} (${partOfSpeech}): ${definitions.join('; ')}`,
    ),
  ].join('\n');
}
