// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import {
  choosePartOfSpeech,
  input,
  kelevNote,
  renderConnectedEditor,
  typeInto,
} from './CardEditor.harness.ts';

describe('CardEditor', () => {
  describe('when the word is in the deck', () => {
    test('warns, naming the note', async () => {
      await renderConnectedEditor({
        existing: {
          exactMatches: [
            {
              noteId: 1751686072898,
              unpointed: 'כלב',
              pointed: 'כֶּלֶב',
              partOfSpeech: '',
              definitions: '',
            },
          ],
          sameRootMatches: [],
          relatedMatches: [],
        },
      });
      await typeInto(input('Hebrew word, without niqqud'), 'כלב');
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      expect(await within(check).findByText('Already in your deck: edit it instead?')).toBeTruthy();
      expect(within(check).getByRole('button', { name: /כֶּלֶב/ })).toBeTruthy();
    });
  });

  describe('when only related notes are in the deck', () => {
    test('lists them without warning', async () => {
      await renderConnectedEditor({
        existing: {
          exactMatches: [],
          sameRootMatches: [],
          relatedMatches: [
            {
              noteId: 1752426864218,
              unpointed: 'בית משפט',
              pointed: 'בֵּית מִשְׁפָּט',
              partOfSpeech: '',
              definitions: '',
            },
          ],
        },
      });
      await typeInto(input('Hebrew word, without niqqud'), 'בית');
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      expect(await within(check).findByText('Related notes in your deck')).toBeTruthy();
      expect(within(check).queryByText('Already in your deck: edit it instead?')).toBeNull();
    });
  });

  describe('when notes share the root', () => {
    test('lists them under the root', async () => {
      const requests = await renderConnectedEditor({
        existing: {
          exactMatches: [],
          sameRootMatches: [
            {
              noteId: 1752427043636,
              unpointed: 'בית ספר',
              pointed: 'בֵּית סֵפֶר',
              partOfSpeech: '',
              definitions: 'school',
            },
          ],
          relatedMatches: [],
        },
      });
      await typeInto(input('Hebrew word, without niqqud'), 'ספר');
      await choosePartOfSpeech('Noun');
      await typeInto(input('Root, like דבר or ד.ב.ר'), 'ס.פ.ר');
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      expect((await within(check).findByText('Same root')).textContent).toContain('ס־פ־ר');
      expect(within(check).getByRole('button', { name: /בֵּית סֵפֶר/ })).toBeTruthy();
      expect(requests.map((request) => request.path)).toContain(
        `/api/anki/existing?word=${encodeURIComponent('ספר')}&root=${encodeURIComponent('ס־פ־ר')}`,
      );
    });
  });

  describe('when the word is not in the deck', () => {
    test('says so quietly', async () => {
      await renderConnectedEditor();
      await typeInto(input('Hebrew word, without niqqud'), 'דג');
      expect(await screen.findByText('Not in the deck yet.')).toBeTruthy();
    });
  });

  describe('while editing a note', () => {
    test('leaves the note out', async () => {
      await renderConnectedEditor(
        {
          existing: {
            exactMatches: [
              {
                noteId: kelevNote().noteId,
                unpointed: 'כלב',
                pointed: 'כֶּלֶב',
                partOfSpeech: '',
                definitions: '',
              },
            ],
            sameRootMatches: [],
            relatedMatches: [
              {
                noteId: 1,
                unpointed: 'כלבה',
                pointed: 'כַּלְבָּה',
                partOfSpeech: '',
                definitions: '',
              },
            ],
          },
        },
        kelevNote(),
      );
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      expect(await within(check).findByText('Related notes in your deck')).toBeTruthy();
      expect(
        within(check)
          .getAllByRole('listitem')
          .map((item) => within(item).getByText('כַּלְבָּה')),
      ).toHaveLength(1);
    });

    test('lists another note with the spelling as another, not as this one', async () => {
      await renderConnectedEditor(
        {
          existing: {
            exactMatches: [
              {
                noteId: 1,
                unpointed: 'כלב',
                pointed: 'כֶּלֶב',
                partOfSpeech: '',
                definitions: '',
              },
            ],
            sameRootMatches: [],
            relatedMatches: [],
          },
        },
        kelevNote(),
      );
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      expect(await within(check).findByText('Also in your deck with this spelling')).toBeTruthy();
    });
  });

  describe('when it finds only the note being edited', () => {
    test('says nothing, rather than that the word is not in the deck', async () => {
      await renderConnectedEditor(
        {
          existing: {
            exactMatches: [
              {
                noteId: kelevNote().noteId,
                unpointed: 'כלב',
                pointed: 'כֶּלֶב',
                partOfSpeech: '',
                definitions: '',
              },
            ],
            sameRootMatches: [],
            relatedMatches: [],
          },
        },
        kelevNote(),
      );
      const check = screen.getByRole('region', { name: 'Already in the deck' });
      await waitFor(() => expect(check.textContent?.trim()).toBe(''));
    });
  });
});
