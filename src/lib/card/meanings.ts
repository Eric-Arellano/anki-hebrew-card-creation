// Whether two notes share an English meaning, which is when a Production card needs a hint to say
// which Hebrew word it wants.
//
// Meanings are compared sense by sense, and a sense as a whole: `to walk, go` lists two senses,
// and `car (formal register)` is a car. The deck writes meanings freely, so this reads the ways
// its old notes do: `to speak / to talk`, `"here is"`, `interjection: correct`.
// *Rejected: sharing any one English word, because every `to …` verb would share `to`, and
// `to make up` isn't `to make`.*

type Sense = { text: string; key: string };

function sensesOf(meaning: string): Sense[] {
  return meaning
    .replace(/\([^)]*\)/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/^[a-z]+:/i, '')
    .split(/[,;/]/)
    .map((sense) => {
      const text = sense.replace(/\s+/g, ' ').trim();
      const key = text
        .toLowerCase()
        .replace(/[.!?]+$/, '')
        .replace(/^(a|an|the) /, '');
      return { text, key };
    })
    .filter((sense) => sense.key !== '');
}

/** Each sense the meanings list, lowercase and without an article, once. */
export function senseKeys(meanings: readonly string[]): string[] {
  return [...new Set(meanings.flatMap(sensesOf).map((sense) => sense.key))];
}

/** The senses of `ours` that `theirs` lists too, as `ours` writes them. */
export function sharedSenses(ours: readonly string[], theirs: readonly string[]): string[] {
  const theirKeys = senseKeys(theirs);
  return ours
    .flatMap(sensesOf)
    .filter((sense) => theirKeys.includes(sense.key))
    .filter((sense, index, shared) => shared.findIndex(({ key }) => key === sense.key) === index)
    .map((sense) => sense.text);
}
