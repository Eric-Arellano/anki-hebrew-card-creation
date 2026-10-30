import { describe, expect, test } from 'vitest';
import { fakeAnki } from '#tests/fake-anki.ts';
import bayitNotes from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import type { NoteInfo } from './client.ts';
import { findExistingNotes } from './existing-notes.ts';

// `&nbsp;` in a field decodes to this, not to a space.
const NBSP = String.fromCodePoint(0xa0);

describe('findExistingNotes', () => {
  function ankiWithNotes(notes: NoteInfo[]) {
    return fakeAnki({
      findNotes: () => notes.map((note) => note.noteId),
      notesInfo: ({ notes: requestedIds }) =>
        notes.filter((note) => requestedIds.includes(note.noteId)),
    });
  }

  const kelevNotes = kelevChatulDagNotes.filter((note) => note.fields.Hebrew.value === 'כלב');

  describe('when the word has its own note', () => {
    test('finds it as an exact match', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      expect(await findExistingNotes(anki, ['כלב'])).toEqual({
        exactMatches: [{ noteId: 1751686072898, unpointed: 'כלב', pointed: 'כֶּלֶב' }],
        relatedMatches: [],
      });
      expect(calls[0]).toEqual({
        action: 'findNotes',
        params: { query: '"note:Hebrew" "Hebrew:*כלב*"' },
      });
    });

    test('finds it from pointed input', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      expect((await findExistingNotes(anki, [' כֶּלֶב '])).exactMatches).toHaveLength(1);
      expect(calls[0]?.params).toEqual({ query: '"note:Hebrew" "Hebrew:*כלב*"' });
    });
  });

  describe('when other notes contain the word', () => {
    test('lists them as related matches', async () => {
      const { anki } = ankiWithNotes(bayitNotes);
      expect(await findExistingNotes(anki, ['בית'])).toEqual({
        exactMatches: [
          { noteId: 1752114960166, unpointed: 'בית', pointed: `(ms) בַּיִת (mp)${NBSP}בָּתִּים` },
        ],
        relatedMatches: [
          { noteId: 1752426864218, unpointed: 'בית משפט', pointed: 'בֵּית מִשְׁפָּט' },
          {
            noteId: 1752427043636,
            unpointed: 'בית ספר',
            pointed: `[ms] בֵּית סֵפֶר [ps]${NBSP}בָּתֵּי סֵפֶר`,
          },
          { noteId: 1752428275813, unpointed: 'בית חולים', pointed: 'בֵּית חוֹלִים' },
          { noteId: 1752428348888, unpointed: 'בית כנסת', pointed: 'בֵּית כְּנֶסֶת' },
        ],
      });
    });
  });

  describe('for several words', () => {
    test('finds the notes that hold any of them, each as an exact match', async () => {
      const { anki, calls } = ankiWithNotes(kelevChatulDagNotes);
      const found = await findExistingNotes(anki, ['כלב', 'חָתוּל']);
      expect(found.exactMatches.map((note) => note.unpointed)).toEqual(['כלב', 'חתול']);
      expect(calls[0]?.params).toEqual({
        query: '"note:Hebrew" ("Hebrew:*כלב*" OR "Hebrew:*חתול*")',
      });
    });

    test('searches for words with the same key once', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      await findExistingNotes(anki, ['כלב', 'כֶּלֶב', ' ']);
      expect(calls[0]?.params).toEqual({ query: '"note:Hebrew" "Hebrew:*כלב*"' });
    });
  });

  describe('when nothing matches', () => {
    test('does not ask for note details', async () => {
      const { anki, calls } = ankiWithNotes([]);
      expect(await findExistingNotes(anki, ['זזזז'])).toEqual({
        exactMatches: [],
        relatedMatches: [],
      });
      expect(calls.map((call) => call.action)).toEqual(['findNotes']);
    });
  });

  describe('when the word is blank', () => {
    test('asks Anki nothing', async () => {
      const { anki, calls } = ankiWithNotes(kelevChatulDagNotes);
      expect(await findExistingNotes(anki, [' '])).toEqual({
        exactMatches: [],
        relatedMatches: [],
      });
      expect(calls).toEqual([]);
    });
  });
});
