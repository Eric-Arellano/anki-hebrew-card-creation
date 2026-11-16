// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { NoteCheck } from '#lib/api/ai.ts';
import type { LoadedNote } from '#lib/api/anki.ts';
import { fromAnkiFields } from '#lib/note-type.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import {
  addRequests,
  claudeAnswered,
  fillDag,
  heldReply,
  input,
  kelevNote,
  pressCmdEnter,
  renderConnectedEditor,
  type ServerReplies,
  type ServerRequest,
  saveRequests,
  skipImage,
  typeExample,
  typeInto,
} from './CardEditor.harness.ts';

const wrongGender: NoteCheck = {
  findings: [
    {
      field: 'examples',
      problem: 'דג is masculine, so גדולה should be גדול.',
      rewrite: 'הדג גדול. — The fish is big.',
    },
  ],
};

function checkRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/ai/check');
}

function checkSection() {
  return screen.getByRole('region', { name: "Claude's check" });
}

async function renderWithClaude(replies: Omit<ServerReplies, 'status'> = {}, note?: LoadedNote) {
  return renderConnectedEditor({ check: () => Response.json(wrongGender), ...replies }, note);
}

// דג, ready to add.
async function fillDagReady() {
  await fillDag();
  await skipImage();
}

describe('CardEditor', () => {
  describe('checking a new note', () => {
    test('reviews it on the first Cmd+Enter, sending its fields, and adds on the second', async () => {
      const requests = await renderWithClaude();
      await fillDagReady();
      await typeExample(1, { hebrew: 'הדג גדולה.', english: 'The fish is big.' });
      await pressCmdEnter();
      expect(screen.getByText('Adding this note to the deck.')).toBeTruthy();
      expect(addRequests(requests)).toEqual([]);
      expect(checkRequests(requests)).toEqual([
        {
          method: 'POST',
          path: '/api/ai/check',
          body: {
            partOfSpeech: 'other',
            fields: fromAnkiFields({
              ...Object.fromEntries(fieldNames.map((name) => [name, ''])),
              Hebrew: 'דג',
              Pointed: 'דָּג',
              Definitions: 'fish',
              'Production answer': 'דג',
              'Part of speech': 'other',
              Examples:
                '<bdi lang="he"><b>הדג</b> גדולה.</bdi><span class="sep"> — </span>' +
                '<span lang="en">The fish is big.</span>',
            }),
          },
        },
      ]);

      await pressCmdEnter();
      await screen.findByText('Added to the deck.');
      expect(addRequests(requests)).toHaveLength(1);
    });

    test('shows each finding with its field and rewrite', async () => {
      await renderWithClaude();
      await fillDagReady();
      await fireEvent.click(screen.getByRole('button', { name: 'Check and add' }));
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkSection().textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Claude found these. Fix what you agree with: ' +
          'Examples: דג is masculine, so גדולה should be גדול. Try: הדג גדול. — The fish is big.',
      );
    });

    test('says so when Claude finds nothing', async () => {
      await renderWithClaude({ check: () => Response.json({ findings: [] }) });
      await fillDagReady();
      await pressCmdEnter();
      expect(await screen.findByText('Claude found no problems.')).toBeTruthy();
    });

    describe('when the check fails', () => {
      test('says why, and still adds', async () => {
        const requests = await renderWithClaude({
          check: () => Response.json({ message: 'Claude declined to answer.' }, { status: 502 }),
        });
        await fillDagReady();
        await pressCmdEnter();
        expect(
          await screen.findByText("Couldn't check the note: Claude declined to answer."),
        ).toBeTruthy();
        await claudeAnswered();
        await fireEvent.click(screen.getByRole('button', { name: 'Add to deck' }));
        await screen.findByText('Added to the deck.');
        expect(addRequests(requests)).toHaveLength(1);
      });
    });

    describe('before Claude answers', () => {
      test('refuses to add until it does', async () => {
        const { reply: check, send } = heldReply<NoteCheck>();
        const requests = await renderWithClaude({ check });
        await fillDagReady();
        await pressCmdEnter();
        expect(screen.getByText('Claude is checking the note…')).toBeTruthy();
        const addToDeck = screen.getByRole('button', { name: 'Add to deck' }) as HTMLButtonElement;
        expect(addToDeck.disabled).toBe(true);
        await pressCmdEnter();
        await fireEvent.click(addToDeck);
        expect(addRequests(requests)).toEqual([]);

        send(wrongGender);
        await within(checkSection()).findByText(/should be גדול/);
        expect(addToDeck.disabled).toBe(false);
        await pressCmdEnter();
        await screen.findByText('Added to the deck.');
        expect(addRequests(requests)).toHaveLength(1);
      });
    });

    describe('when cancelled', () => {
      test('adds nothing, and abandons the check', async () => {
        const { reply: check, signal } = heldReply<NoteCheck>();
        const requests = await renderWithClaude({ check });
        await fillDagReady();
        await pressCmdEnter();
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(signal()?.aborted).toBe(true);
        expect(screen.getByRole('button', { name: 'Check and add' })).toBeTruthy();
        expect(addRequests(requests)).toEqual([]);
      });
    });
  });

  describe('checking an edit', () => {
    test('shows the findings beside what will change', async () => {
      const requests = await renderWithClaude({ notes: [kelevNote()] }, kelevNote());
      await screen.findByRole('button', { name: 'Suggest with Claude' });
      await typeInto(input('English meaning'), 'hound');
      await pressCmdEnter();
      expect(screen.getByText('Saving changes these fields in Anki:')).toBeTruthy();
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkRequests(requests)[0]?.body).toMatchObject({
        partOfSpeech: 'noun',
        fields: { definitions: 'hound' },
      });

      await pressCmdEnter();
      await screen.findByText('Saved to Anki.');
      expect(saveRequests(requests)).toHaveLength(1);
    });
  });

  describe('checking only', () => {
    function checkOnly() {
      return screen.getByRole('button', { name: 'Check only' });
    }

    test('checks a loaded note with nothing changed, saving nothing', async () => {
      const requests = await renderWithClaude({ notes: [kelevNote()] }, kelevNote());
      await screen.findByRole('button', { name: 'Suggest with Claude' });
      expect(
        (screen.getByRole('button', { name: 'Check and save' }) as HTMLButtonElement).disabled,
      ).toBe(true);
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkRequests(requests)[0]?.body).toMatchObject({
        partOfSpeech: 'noun',
        fields: { unpointed: 'כלב', definitions: 'dog' },
      });
      expect(saveRequests(requests)).toEqual([]);
    });

    describe('when nothing changed since the last check', () => {
      test('shows the last answer rather than asking again', async () => {
        const requests = await renderWithClaude({ notes: [kelevNote()] }, kelevNote());
        await screen.findByRole('button', { name: 'Suggest with Claude' });
        await fireEvent.click(checkOnly());
        await within(checkSection()).findByText(/should be גדול/);
        await fireEvent.click(checkOnly());
        await within(checkSection()).findByText(/should be גדול/);
        expect(checkRequests(requests)).toHaveLength(1);
      });

      test('reviews with the last answer on Cmd+Enter', async () => {
        const requests = await renderWithClaude();
        await fillDagReady();
        await fireEvent.click(checkOnly());
        await within(checkSection()).findByText(/should be גדול/);
        await pressCmdEnter();
        expect(screen.getByText('Adding this note to the deck.')).toBeTruthy();
        expect(within(checkSection()).getByText(/should be גדול/)).toBeTruthy();
        expect(checkRequests(requests)).toHaveLength(1);
      });
    });

    test('asks again once a field changes', async () => {
      const requests = await renderWithClaude({ notes: [kelevNote()] }, kelevNote());
      await screen.findByRole('button', { name: 'Suggest with Claude' });
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      await typeInto(input('English meaning'), 'hound');
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkRequests(requests)).toHaveLength(2);
    });

    test('asks again after a check fails', async () => {
      let replies = 0;
      const requests = await renderWithClaude({
        check: () =>
          ++replies === 1
            ? Response.json({ message: 'Claude declined to answer.' }, { status: 502 })
            : Response.json(wrongGender),
      });
      await fillDagReady();
      await fireEvent.click(checkOnly());
      await screen.findByText("Couldn't check the note: Claude declined to answer.");
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkRequests(requests)).toHaveLength(2);
    });
  });
});
