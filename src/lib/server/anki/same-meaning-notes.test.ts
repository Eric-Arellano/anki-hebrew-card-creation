import { describe, expect, test } from 'vitest';
import { fakeAnki } from '#tests/fake-anki.ts';
import bayitNotes from '#tests/fixtures/anki/notes-info-bayit.json' with { type: 'json' };
import mechonitOtoNotes from '#tests/fixtures/anki/notes-info-mechonit-oto.json' with {
  type: 'json',
};
import type { NoteInfo } from './client.ts';
import { findSameMeaningNotes } from './same-meaning-notes.ts';

describe('findSameMeaningNotes', () => {
  function ankiWithNotes(notes: NoteInfo[]) {
    return fakeAnki({
      findNotes: () => notes.map((note) => note.noteId),
      notesInfo: ({ notes: requestedIds }) =>
        notes.filter((note) => requestedIds.includes(note.noteId)),
    });
  }

  describe('when other words share a meaning', () => {
    test('lists each with the meanings it shares and its hint', async () => {
      const { anki, calls } = ankiWithNotes(mechonitOtoNotes);
      expect(await findSameMeaningNotes(anki, ['car', 'automobile'], ['רכב'])).toEqual([
        {
          noteId: 1751762491688,
          unpointed: 'מכונית',
          pointed: 'מְכוֹנִית',
          sharedMeanings: ['car'],
          productionContext: '',
        },
        {
          noteId: 1751762573921,
          unpointed: 'אוטו',
          pointed: 'אוֹטוֹ',
          sharedMeanings: ['car'],
          productionContext: '',
        },
      ]);
      expect(calls[0]).toEqual({
        action: 'findNotes',
        params: {
          query: String.raw`"note:Hebrew" ("Definitions:re:\bcar\b" OR "Definitions:re:\bautomobile\b")`,
        },
      });
    });

    test('reads the hint as text', async () => {
      const [mechonit] = mechonitOtoNotes;
      if (mechonit === undefined) throw new Error('No fixture note');
      const hinted = {
        ...mechonit,
        fields: {
          ...mechonit.fields,
          'Production context': { value: 'formal,&nbsp;not slang', order: 4 },
        },
      };
      const { anki } = ankiWithNotes([hinted]);
      const [found] = await findSameMeaningNotes(anki, ['car'], []);
      expect(found?.productionContext).toBe('formal, not slang');
    });
  });

  describe('when a note is for the word itself', () => {
    test('leaves it out, by its unpointed key', async () => {
      const { anki } = ankiWithNotes(mechonitOtoNotes);
      const found = await findSameMeaningNotes(anki, ['car'], [' מְכוֹנִית ']);
      expect(found.map((note) => note.unpointed)).toEqual(['אוטו']);
    });
  });

  describe('when the search finds the meaning only in parentheses', () => {
    test('leaves the note out', async () => {
      const { anki } = ankiWithNotes(mechonitOtoNotes);
      expect(await findSameMeaningNotes(anki, ['register'], [])).toEqual([]);
    });
  });

  describe('when nothing matches', () => {
    test('does not ask for note details', async () => {
      const { anki, calls } = ankiWithNotes([]);
      expect(await findSameMeaningNotes(anki, ['house'], [])).toEqual([]);
      expect(calls.map((call) => call.action)).toEqual(['findNotes']);
    });
  });

  describe('when the meanings are blank', () => {
    test('asks Anki nothing', async () => {
      const { anki, calls } = ankiWithNotes(bayitNotes);
      expect(await findSameMeaningNotes(anki, [' ', '()'], ['בית'])).toEqual([]);
      expect(calls).toEqual([]);
    });
  });
});
