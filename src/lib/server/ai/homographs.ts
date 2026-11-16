// The other words a note's spelling could be read as without niqqud, which both the suggestions
// and the check tell Claude about, so a Reading context can be judged against them.
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import { isSameReading, toLookupKey } from '#lib/hebrew/normalize.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';
import { lookUp, withDictionary } from '#lib/server/dictionary/lookup.ts';
import type { DictionaryPaths } from '#lib/server/dictionary/paths.ts';

export type Homograph = { pointed: string; partOfSpeech: PartOfSpeech; definitions: string[] };

/**
 * The other words `word` could be read as without niqqud: the entries titled with its spelling
 * that `pointed` doesn't read as. None when `pointed` is blank, since then nothing tells the
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
    // By its reading, since the note's niqqud may come from a source that points the word another
    // way, and its own entry would then be listed as a word to tell it apart from.
    !isSameReading(candidate.pointed, pointed)
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

/** `word`'s homographs, looked up in the dictionary. Throws `DictionaryUnavailableError`. */
export function lookUpHomographs(
  paths: DictionaryPaths,
  word: string,
  pointed: string,
): Homograph[] {
  return withDictionary(paths, (db, staleIndex) =>
    homographsOf(lookUp(db, word, staleIndex), word, pointed),
  );
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
