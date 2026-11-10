import bayit from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import kelevChatulDag from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};

/** Each field of the fixture note whose `Hebrew` is `word`, by Anki name, as Anki holds it. */
export function realNote(word: string): Record<string, string> {
  const note = [...kelevChatulDag, ...bayit].find(({ fields }) => fields.Hebrew.value === word);
  if (note === undefined) throw new Error(`No fixture note for ${word}`);
  return Object.fromEntries(Object.entries(note.fields).map(([name, { value }]) => [name, value]));
}

/** One field of the fixture note whose `Hebrew` is `word`, by its Anki name. */
export function realField(word: string, field: string): string {
  const value = realNote(word)[field];
  if (value === undefined) throw new Error(`No fixture field ${field} for ${word}`);
  return value;
}
