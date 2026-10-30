// Fills the editor's inputs from the dictionary entry the human picked, never the fields those
// inputs compose. An input the entry gives one value fills with it; one it gives several stays
// blank, with the values offered as choices; one it gives none stays blank.
//
// The English meaning is left alone: the human writes their own, with the glosses beside them.
// **Open:** whether it should ever start from the glosses.
import type { DictionaryCandidate, DictionaryInfinitive } from '#lib/api/dictionary.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { toDefectiveKey } from '#lib/hebrew/normalize.ts';

// Each list holds two or more values.
export type PrefillChoices = {
  infinitives?: DictionaryInfinitive[];
  plural?: string[];
  feminine?: string[];
  femininePlural?: string[];
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
      const { gender, plurals, feminines, femininePlurals } = candidate.noun;
      return {
        draft: {
          ...draft,
          ...word,
          partOfSpeech: 'noun',
          noun: {
            gender: gender?.gender,
            pluralOnly: gender?.pluralOnly ?? false,
            plural: onlyValue(plurals),
            feminine: onlyValue(feminines),
            femininePlural: onlyValue(femininePlurals),
          },
        },
        choices: {
          plural: choicesAmong(plurals),
          feminine: choicesAmong(feminines),
          femininePlural: choicesAmong(femininePlurals),
        },
      };
    }
    case 'verb': {
      // The deck's verbs go by their infinitive, while the dictionary's go by the past 3ms.
      const { binyan, infinitives } = candidate.verb;
      const infinitive = infinitives.length === 1 ? infinitives[0] : undefined;
      return {
        draft: {
          ...draft,
          word: infinitive?.unpointed ?? '',
          pointed: infinitive?.pointed ?? '',
          partOfSpeech: 'verb',
          // The preposition is only ever suggested, so it stays as the human chose it.
          verb: { ...draft.verb, binyan, root: onlyValue(candidate.roots) },
        },
        choices: { infinitives: choicesAmong(infinitives), root: choicesAmong(candidate.roots) },
      };
    }
    case 'other':
      return { draft: { ...draft, ...word, partOfSpeech: 'other' }, choices: {} };
  }
}

/** `draft` with each input `prefillDraft` writes back as it was in `before`, the draft it was given. */
export function undoPrefill(draft: CardInputsDraft, before: CardInputsDraft): CardInputsDraft {
  return {
    ...draft,
    word: before.word,
    pointed: before.pointed,
    partOfSpeech: before.partOfSpeech,
    noun: before.noun,
    verb: { ...draft.verb, binyan: before.verb.binyan, root: before.verb.root },
  };
}

// Retyping keeps the entry while the word still spells it, ignoring ו and י, as when `אוירון` is
// written `אווירון`. Typing into a word the entry left blank, like an infinitive it gives only
// pointed, keeps it too.
export function stillSpellsEntry(word: string, filledWord: string): boolean {
  return filledWord === '' || toDefectiveKey(word) === toDefectiveKey(filledWord);
}

function onlyValue(values: readonly string[]): string {
  return values.length === 1 ? (values[0] ?? '') : '';
}

function choicesAmong<T>(values: readonly T[]): T[] | undefined {
  return values.length > 1 ? [...values] : undefined;
}
