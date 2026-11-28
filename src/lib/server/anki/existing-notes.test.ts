import { describe, expect, test } from 'vitest';
import { ankiWithNotes, fakeAnki } from '#tests/fake-anki.ts';
import bayitNotes from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import kelevChatulDagNotes from '#tests/fixtures/anki/notes-info-kelev-chatul-dag.json' with {
  type: 'json',
};
import { noteInfo } from '#tests/real-notes.ts';
import type { NoteInfo } from './client.ts';
import { findExistingNotes } from './existing-notes.ts';

// `&nbsp;` in a field decodes to this, not to a space.
const NBSP = String.fromCodePoint(0xa0);

describe('findExistingNotes', () => {
  const kelevNotes = [noteInfo('כלב')];

  describe('when the word has its own note', () => {
    test('finds it as an exact match', async () => {
      const { anki, calls } = ankiWithNotes(kelevNotes);
      expect(await findExistingNotes(anki, ['כלב'])).toEqual({
        exactMatches: [
          {
            noteId: 1751686072898,
            word: 'כלב',
            wordPointed: 'כֶּלֶב',
            partOfSpeech: '',
            meanings: 'dog',
          },
        ],
        sameRootMatches: [],
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
        sameRootMatches: [],
        exactMatches: [
          {
            noteId: 1752114960166,
            word: 'בית',
            wordPointed: `(ms) בַּיִת (mp)${NBSP}בָּתִּים`,
            partOfSpeech: '',
            meanings: 'house',
          },
        ],
        relatedMatches: [
          {
            noteId: 1752426864218,
            word: 'בית משפט',
            wordPointed: 'בֵּית מִשְׁפָּט',
            partOfSpeech: '',
            meanings: '',
          },
          {
            noteId: 1752427043636,
            word: 'בית ספר',
            wordPointed: `[ms] בֵּית סֵפֶר [ps]${NBSP}בָּתֵּי סֵפֶר`,
            partOfSpeech: '',
            meanings: 'school',
          },
          {
            noteId: 1752428275813,
            word: 'בית חולים',
            wordPointed: 'בֵּית חוֹלִים',
            partOfSpeech: '',
            meanings: '',
          },
          {
            noteId: 1752428348888,
            word: 'בית כנסת',
            wordPointed: 'בֵּית כְּנֶסֶת',
            partOfSpeech: '',
            meanings: '',
          },
        ],
      });
    });
  });

  describe('for several words', () => {
    test('finds the notes that hold any of them, each as an exact match', async () => {
      const { anki, calls } = ankiWithNotes(kelevChatulDagNotes);
      const found = await findExistingNotes(anki, ['כלב', 'חָתוּל']);
      expect(found.exactMatches.map((note) => note.word)).toEqual(['כלב', 'חתול']);
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

  describe('with a root', () => {
    const bayit = noteInfo('בית');
    const mishpat = noteInfo('בית משפט');
    const sefer = noteInfo('בית ספר');
    const rootQuery = '"note:Hebrew" "Root:ב־י־ת"';

    // Anki answers the word's search and the root's apart, as each query asks.
    function ankiFinding(byQuery: Record<string, NoteInfo[]>) {
      return fakeAnki({
        findNotes: ({ query }) => (byQuery[query] ?? []).map((note) => note.noteId),
        notesInfo: ({ notes: requestedIds }) =>
          bayitNotes.filter((note) => requestedIds.includes(note.noteId)),
      });
    }

    test('lists the notes only the root finds as the same root', async () => {
      const { anki, calls } = ankiFinding({
        '"note:Hebrew" "Hebrew:*בית*"': [bayit],
        [rootQuery]: [bayit, sefer],
      });
      const found = await findExistingNotes(anki, ['בית'], 'ב־י־ת');
      expect(found.exactMatches.map((note) => note.word)).toEqual(['בית']);
      expect(found.sameRootMatches.map((note) => note.word)).toEqual(['בית ספר']);
      expect(found.relatedMatches).toEqual([]);
      expect(calls.map((call) => call.params)).toEqual([
        { query: '"note:Hebrew" "Hebrew:*בית*"' },
        { query: rootQuery },
        { notes: [bayit.noteId, sefer.noteId] },
      ]);
    });

    test('lists a note both find as the same root, not as related', async () => {
      const { anki } = ankiFinding({
        '"note:Hebrew" "Hebrew:*בית*"': [bayit, mishpat, sefer],
        [rootQuery]: [sefer],
      });
      const found = await findExistingNotes(anki, ['בית'], 'ב־י־ת');
      expect(found.sameRootMatches.map((note) => note.word)).toEqual(['בית ספר']);
      expect(found.relatedMatches.map((note) => note.word)).toEqual(['בית משפט']);
    });

    test('finds only the root when the word is in no note', async () => {
      const { anki } = ankiFinding({ [rootQuery]: [sefer] });
      const found = await findExistingNotes(anki, ['ביתי'], 'ב־י־ת');
      expect(found.sameRootMatches.map((note) => note.word)).toEqual(['בית ספר']);
    });
  });

  describe('when nothing matches', () => {
    test('does not ask for note details', async () => {
      const { anki, calls } = ankiWithNotes([]);
      expect(await findExistingNotes(anki, ['זזזז'])).toEqual({
        exactMatches: [],
        sameRootMatches: [],
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
        sameRootMatches: [],
        relatedMatches: [],
      });
      expect(calls).toEqual([]);
    });
  });
});
