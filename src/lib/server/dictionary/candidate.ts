import type { DatabaseSync } from 'node:sqlite';
import type { DictionaryCandidate } from '#lib/api/dictionary.ts';
import { toBinyan } from '#lib/hebrew/binyan.ts';
import { isSamePointedText, toLookupKey, uniquePointedText } from '#lib/hebrew/normalize.ts';
import type { GovernedPreposition } from '#lib/hebrew/preposition.ts';
import { governedPreposition, nounGender, partOfSpeechOf } from './convert.ts';
import { type Entry, entriesWithKey } from './entries.ts';

// A form shared by many words, like a common possessive, shouldn't list them all.
const MAX_CANDIDATES = 12;

function toCandidate(db: DatabaseSync, lemma: Entry): DictionaryCandidate {
  const { facts } = lemma;
  const shared = {
    id: lemma.id,
    title: lemma.word,
    pointed: lemma.pointed ?? undefined,
    wiktionaryPartOfSpeech: lemma.pos,
    definitions: facts.glosses,
    roots: facts.roots,
  };
  const partOfSpeech = partOfSpeechOf(lemma.pos);
  switch (partOfSpeech) {
    case 'noun':
      return {
        ...shared,
        partOfSpeech,
        noun: {
          gender: nounGender(facts.genders),
          // A noun used in pairs, like `עַיִן`, may list only its dual.
          plurals: facts.plurals.length > 0 ? facts.plurals : facts.duals,
          feminineSingulars: facts.feminines,
          femininePlurals: uniquePointedText([
            ...facts.femininePlurals,
            ...counterpartPlurals(db, lemma),
          ]),
        },
      };
    case 'verb':
      return {
        ...shared,
        partOfSpeech,
        verb: {
          binyan: facts.binyanCode === undefined ? undefined : toBinyan(facts.binyanCode),
          infinitives: facts.infinitives,
          prepositions: [
            ...new Set(
              facts.prepositions.flatMap((text): GovernedPreposition[] => {
                const preposition = governedPreposition(text);
                return preposition === undefined ? [] : [preposition];
              }),
            ),
          ],
        },
      };
    case 'other':
      return { ...shared, partOfSpeech };
  }
}

export function toCandidates(db: DatabaseSync, lemmas: readonly Entry[]): DictionaryCandidate[] {
  return lemmas.slice(0, MAX_CANDIDATES).map((lemma) => toCandidate(db, lemma));
}

// A masculine noun almost never lists its feminine counterpart's plural: that is on the
// feminine's own entry, the one whose `m` names this noun. `חתולה` has two entries, and only
// `חֲתוּלָה` names `חָתוּל`.
function counterpartPlurals(db: DatabaseSync, masculine: Entry): string[] {
  const { pointed } = masculine;
  if (pointed === null) return [];
  return masculine.facts.feminines.flatMap((feminine) =>
    entriesWithKey(db, 'key', toLookupKey(feminine))
      .filter(
        (entry) =>
          entry.pos === 'noun' &&
          entry.facts.masculines.some((named) => isSamePointedText(named, pointed)),
      )
      .flatMap((entry) => entry.facts.plurals),
  );
}
