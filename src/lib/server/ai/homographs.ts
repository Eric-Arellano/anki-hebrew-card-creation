// The other words a note's spelling could be read as without niqqud, which both the suggestions
// and the check tell Claude about, so a Reading context can be judged against them.
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import { isSameReading, toLookupKey } from '#lib/hebrew/normalize.ts';
import type { PartOfSpeech } from '#lib/note-type.ts';
import { lookUp, withDictionary } from '#lib/server/dictionary/lookup.ts';
import type { DictionaryPaths } from '#lib/server/dictionary/paths.ts';

export type Homograph = { pointed: string; partOfSpeech: PartOfSpeech; definitions: string[] };

/**
 * The other words `word` could be read as without niqqud: the entries spelled `word` that
 * `pointed` doesn't read as. None when `pointed` is blank, since then nothing tells the note's own
 * entry apart.
 */
export function homographsOf(lookup: DictionaryLookup, word: string, pointed: string): Homograph[] {
  if (lookup.match !== 'exact' || pointed.trim() === '') return [];
  const key = toLookupKey(word);
  return lookup.candidates.flatMap((candidate) => {
    const spelled = readingSpelled(candidate, key);
    // By its reading, since the note's niqqud may come from a source that points the word another
    // way, and its own entry would then be listed as a word to tell it apart from.
    if (spelled === undefined || readingsOf(candidate).some((own) => isSameReading(own, pointed))) {
      return [];
    }
    return [
      {
        pointed: spelled,
        partOfSpeech: candidate.partOfSpeech,
        definitions: candidate.definitions,
      },
    ];
  });
}

// A lemma the lookup reached through one of its forms isn't a reading of this spelling: `כלב`
// finds `כַּלְבָּה` through its masculine. A verb's infinitive is, since the deck files a verb under
// it, and its entry is titled with the past: `לפנות` is `לִפְנוֹת`, "to turn", or `לְפַנּוֹת`, "to
// clear". Only by the source's own unpointed infinitive, as stripping the pointed one misspells
// some (`source-forms.ts`).
function readingSpelled(candidate: DictionaryCandidate, key: string): string | undefined {
  if (candidate.pointed !== undefined && toLookupKey(candidate.title) === key) {
    return candidate.pointed;
  }
  if (candidate.partOfSpeech !== 'verb') return undefined;
  return candidate.verb.infinitives.find(
    ({ unpointed }) => unpointed !== undefined && toLookupKey(unpointed) === key,
  )?.pointed;
}

function readingsOf(candidate: DictionaryCandidate): string[] {
  return [
    ...(candidate.pointed === undefined ? [] : [candidate.pointed]),
    ...(candidate.partOfSpeech === 'verb'
      ? candidate.verb.infinitives.map(({ pointed }) => pointed)
      : []),
  ];
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
