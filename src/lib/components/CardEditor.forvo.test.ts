// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ForvoDownload, ForvoDownloads } from '#lib/api/forvo.ts';
import {
  fillDag,
  handOff,
  input,
  mediaRequests,
  renderConnectedEditor,
  skipImage,
  typeInto,
} from './CardEditor.harness.ts';

const DAG = 'pronunciation_he_דג.mp3';
const DAG_AGAIN = 'pronunciation_he_דג (1).mp3';
const dag: ForvoDownload = { filename: DAG, storeAs: DAG };
const dagAgain: ForvoDownload = { filename: DAG_AGAIN, storeAs: DAG };

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:recording');
  URL.revokeObjectURL = vi.fn();
});

/** Downloads that hold `downloads` for דג, and nothing for any other word. */
function downloadsOfDag(downloads: () => ForvoDownload[]) {
  return (word: string): ForvoDownloads => ({
    kind: 'found',
    downloads: word === 'דג' ? downloads() : [],
  });
}

function audioWidget() {
  return within(screen.getByRole('group', { name: 'Audio' }));
}

async function attachedName() {
  return (await audioWidget().findByLabelText('Recording')).nextElementSibling?.textContent;
}

describe('CardEditor', () => {
  describe('finding a Forvo download', () => {
    describe('when one matches the word', () => {
      test('attaches it, and hands it off under its own name', async () => {
        const requests = await renderConnectedEditor({
          forvoDownloads: downloadsOfDag(() => [dag]),
        });
        await fillDag();
        await skipImage();
        expect(await attachedName()).toBe(DAG);

        expect(await handOff(requests)).toMatchObject({ fields: { Audio: `[sound:${DAG}]` } });
        expect(mediaRequests(requests)).toEqual([
          {
            method: 'POST',
            path: '/api/anki/media',
            body: { filename: DAG, data: btoa('mp3 bytes') },
          },
        ]);
      });

      test("drops the browser's suffix from the name", async () => {
        await renderConnectedEditor({ forvoDownloads: downloadsOfDag(() => [dagAgain]) });
        await fillDag();
        expect(await attachedName()).toBe(DAG);
      });
    });

    describe('when several match', () => {
      test('offers each, and attaches the one picked', async () => {
        await renderConnectedEditor({ forvoDownloads: downloadsOfDag(() => [dagAgain, dag]) });
        await fillDag();
        await fireEvent.click(
          await audioWidget().findByRole('button', { name: `Attach ${DAG_AGAIN}` }),
        );
        expect(await attachedName()).toBe(DAG);
        expect(audioWidget().queryByRole('list', { name: 'Found in Downloads' })).toBeNull();
      });
    });

    describe('when the download arrives after the word', () => {
      test('finds it once the tab regains focus', async () => {
        let downloaded: ForvoDownload[] = [];
        await renderConnectedEditor({ forvoDownloads: downloadsOfDag(() => downloaded) });
        await fillDag();
        await new Promise((resolve) => setTimeout(resolve, 400));
        expect(audioWidget().queryByLabelText('Recording')).toBeNull();

        downloaded = [dag];
        await fireEvent.focus(window);
        expect(await attachedName()).toBe(DAG);
      });
    });

    describe('when the word changes', () => {
      test('drops the audio found for the old word', async () => {
        await renderConnectedEditor({ forvoDownloads: downloadsOfDag(() => [dag]) });
        await fillDag();
        expect(await attachedName()).toBe(DAG);

        await typeInto(input('Hebrew word, without niqqud'), 'דגל');
        expect(audioWidget().queryByLabelText('Recording')).toBeNull();
      });

      test('keeps audio the human attached', async () => {
        await renderConnectedEditor();
        await fillDag();
        const mp3 = new File(['mp3'], 'mine.mp3', { type: 'audio/mpeg' });
        await fireEvent.drop(document.body, {
          dataTransfer: { items: [], types: ['Files'], files: [mp3] },
        });
        await typeInto(input('Hebrew word, without niqqud'), 'דגל');
        expect(await attachedName()).toBe('mine.mp3');
      });
    });

    describe('when the human removes the found audio', () => {
      test('offers it instead of attaching it again', async () => {
        await renderConnectedEditor({ forvoDownloads: downloadsOfDag(() => [dag]) });
        await fillDag();
        await attachedName();
        await fireEvent.click(audioWidget().getByRole('button', { name: 'Remove audio' }));

        expect(await audioWidget().findByRole('button', { name: `Attach ${DAG}` })).toBeTruthy();
        expect(audioWidget().queryByLabelText('Recording')).toBeNull();
      });
    });

    describe('when Downloads is unreadable', () => {
      test('says why', async () => {
        await renderConnectedEditor({
          forvoDownloads: () => ({ kind: 'unreadable', message: 'No access.' }),
        });
        await fillDag();
        expect(
          await audioWidget().findByText("Couldn't look in Downloads: No access."),
        ).toBeTruthy();
      });
    });
  });
});
