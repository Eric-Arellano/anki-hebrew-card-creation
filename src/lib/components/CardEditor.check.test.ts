// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import type { CheckRequest, NoteCheck } from '#lib/api/ai.ts';
import type { LoadedNote } from '#lib/api/anki.ts';
import { fromAnkiFields } from '#lib/note-type.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { loadedNote } from '#tests/real-notes.ts';
import {
  addRequests,
  fillDag,
  input,
  renderConnectedEditor,
  type ServerReplies,
  type ServerRequest,
  saveRequests,
  skipImage,
  typeExample,
  typeInto,
} from './CardEditor.harness.ts';

// With its part of speech filled in, the one input the fixture lacks.
const kelev: LoadedNote = (() => {
  const note = loadedNote('כלב');
  return { ...note, fields: { ...note.fields, 'Part of speech': 'noun' } };
})();

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

async function pressCmdEnter() {
  await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
}

// A reply the test sends once it has done what the human does while waiting, and the signal the
// editor sent the request with.
function heldReply() {
  let send: (check: NoteCheck) => void = () => {};
  let signal: AbortSignal | undefined;
  const reply = new Promise<Response>((resolve) => {
    send = (check) => resolve(Response.json(check));
  });
  return {
    check: (_: CheckRequest, sentWith: AbortSignal | undefined) => {
      signal = sentWith;
      return reply;
    },
    send: (check: NoteCheck) => send(check),
    signal: () => signal,
  };
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
        await fireEvent.click(screen.getByRole('button', { name: 'Add to deck' }));
        await screen.findByText('Added to the deck.');
        expect(addRequests(requests)).toHaveLength(1);
      });
    });

    describe('when saved before Claude answers', () => {
      test('adds at once, and abandons the check', async () => {
        const { check, send, signal } = heldReply();
        const requests = await renderWithClaude({ check });
        await fillDagReady();
        await pressCmdEnter();
        expect(screen.getByText('Claude is checking the note…')).toBeTruthy();
        await pressCmdEnter();
        await screen.findByText('Added to the deck.');
        expect(addRequests(requests)).toHaveLength(1);
        expect(signal()?.aborted).toBe(true);
        send(wrongGender);
        expect(screen.queryByRole('region', { name: "Claude's check" })).toBeNull();
      });
    });

    describe('when cancelled', () => {
      test('adds nothing, and abandons the check', async () => {
        const { check, signal } = heldReply();
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
      const requests = await renderWithClaude({ notes: [kelev] }, kelev);
      await screen.findByRole('button', { name: 'Suggest' });
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
      const requests = await renderWithClaude({ notes: [kelev] }, kelev);
      await screen.findByRole('button', { name: 'Suggest' });
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

    test('asks again on each click', async () => {
      const requests = await renderWithClaude({ notes: [kelev] }, kelev);
      await screen.findByRole('button', { name: 'Suggest' });
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      await fireEvent.click(checkOnly());
      await within(checkSection()).findByText(/should be גדול/);
      expect(checkRequests(requests)).toHaveLength(2);
    });

    test('gives way to the review on Cmd+Enter', async () => {
      const requests = await renderWithClaude();
      await fillDagReady();
      await fireEvent.click(checkOnly());
      await pressCmdEnter();
      expect(screen.getByText('Adding this note to the deck.')).toBeTruthy();
      expect(checkRequests(requests)).toHaveLength(2);
    });
  });
});
