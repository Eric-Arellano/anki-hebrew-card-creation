// Fills the editor's inputs from the dictionary entry the human picked, never the fields those
// inputs compose. An input the entry gives one value fills with it; one it gives several stays
// blank, with the values offered as choices; one it gives none stays blank.
//
// The English meaning is left alone: the human writes their own, with the definitions beside them.
// **Open:** whether it should ever start from the definitions.
import type { DictionaryCandidate, DictionaryInfinitive } from '#lib/api/dictionary.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { toDefectiveKey } from '#lib/hebrew/normalize.ts';

// Each list holds two or more values.
export type PrefillChoices = {
  infinitives?: DictionaryInfinitive[];
  plural?: string[];
  feminine?: string[];
  masculinePlural?: string[];
  femininePlural?: string[];
  present?: string[];
  future?: string[];
  root?: string[];
};

export function prefillDraft(
  draft: CardInputsDraft,
  candidate: DictionaryCandidate,
): { draft: CardInputsDraft; choices: PrefillChoices } {
  // The page title is the dictionary's own unpointed spelling, so `ערים` typed becomes `עיר`.
  const word = { word: candidate.title, pointed: candidate.pointed ?? '' };
  switch (candidate.partOfSpeech) {
    case 'noun': {
      const { gender, plurals, feminineSingulars, femininePlurals } = candidate.noun;
      return {
        draft: {
          ...draft,
          ...word,
          partOfSpeech: 'noun',
          root: onlyValue(candidate.roots),
          noun: {
            gender: gender?.gender,
            pluralOnly: gender?.pluralOnly ?? false,
            plural: onlyValue(plurals),
            feminine: onlyValue(feminineSingulars),
            femininePlural: onlyValue(femininePlurals),
          },
        },
        choices: {
          plural: choicesAmong(plurals),
          feminine: choicesAmong(feminineSingulars),
          femininePlural: choicesAmong(femininePlurals),
          root: choicesAmong(candidate.roots),
        },
      };
    }
    case 'verb': {
      // The deck's verbs go by their infinitive, while the dictionary's go by the past 3ms, which
      // becomes the note's past form. The infinitive is what “to speak” asks for and what follows
      // “I want”, and the past can't predict it: `הָלַךְ` → `לָלֶכֶת`. A passive has none to fill.
      // *Rejected: the past 3ms, because over a quarter share their spelling with another entry,
      // like `כתב` with the noun, where under 1% of infinitives do.*
      const { binyan, infinitives, presents, futures } = candidate.verb;
      const infinitive = infinitives.length === 1 ? infinitives[0] : undefined;
      return {
        draft: {
          ...draft,
          word: infinitive === undefined ? '' : unpointedInfinitive(infinitive, draft.word),
          pointed: infinitive?.pointed ?? '',
          partOfSpeech: 'verb',
          root: onlyValue(candidate.roots),
          // The preposition is only ever suggested, so it stays as the human chose it.
          verb: {
            ...draft.verb,
            binyan,
            past: candidate.pointed ?? '',
            present: onlyValue(presents),
            future: onlyValue(futures),
          },
        },
        choices: {
          infinitives: choicesAmong(infinitives),
          present: choicesAmong(presents),
          future: choicesAmong(futures),
          root: choicesAmong(candidate.roots),
        },
      };
    }
    case 'adjective': {
      const { feminineSingulars, masculinePlurals, femininePlurals } = candidate.adjective;
      return {
        draft: {
          ...draft,
          ...word,
          partOfSpeech: 'adjective',
          root: onlyValue(candidate.roots),
          adjective: {
            feminine: onlyValue(feminineSingulars),
            masculinePlural: onlyValue(masculinePlurals),
            femininePlural: onlyValue(femininePlurals),
          },
        },
        choices: {
          feminine: choicesAmong(feminineSingulars),
          masculinePlural: choicesAmong(masculinePlurals),
          femininePlural: choicesAmong(femininePlurals),
          root: choicesAmong(candidate.roots),
        },
      };
    }
    case 'adverb':
    case 'preposition':
    case 'phrase':
    case 'other':
      return { draft: { ...draft, ...word, partOfSpeech: candidate.partOfSpeech }, choices: {} };
  }
}

/** `draft` with each input `prefillDraft` writes back as it was in `before`, the draft it was given. */
export function undoPrefill(draft: CardInputsDraft, before: CardInputsDraft): CardInputsDraft {
  return {
    ...draft,
    word: before.word,
    pointed: before.pointed,
    partOfSpeech: before.partOfSpeech,
    root: before.root,
    noun: before.noun,
    adjective: before.adjective,
    verb: { ...before.verb, preposition: draft.verb.preposition },
  };
}

// Retyping keeps the entry while the word still spells it, ignoring ו and י, as when `אוירון` is
// written `אווירון`. Typing into a word the entry left blank, like an infinitive it gives only
// pointed, keeps it too.
export function stillSpellsEntry(word: string, filledWord: string): boolean {
  return filledWord === '' || toDefectiveKey(word) === toDefectiveKey(filledWord);
}

// The human's spelling stands in for one the dictionary lacks, so long as it is this infinitive.
function unpointedInfinitive({ pointed, unpointed }: DictionaryInfinitive, typed: string): string {
  if (unpointed !== undefined) return unpointed;
  return toDefectiveKey(typed) === toDefectiveKey(pointed) ? typed.trim() : '';
}

function onlyValue(values: readonly string[]): string {
  return values.length === 1 ? (values[0] ?? '') : '';
}

function choicesAmong<T>(values: readonly T[]): T[] | undefined {
  return values.length > 1 ? [...values] : undefined;
}
