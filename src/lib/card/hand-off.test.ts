import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { emptyCardDraft, type MediaDraft } from './draft.ts';
import { attachmentsToStore, handOffFields } from './hand-off.ts';

const blankFields = Object.fromEntries(fieldNames.map((name) => [name, '']));

describe('handOffFields', () => {
  test('sends what composition gives each field, and every other field blank', () => {
    expect(
      handOffFields({ composed: { unpointed: 'דג', gender: 'm' }, edits: {}, shownFields: [] }),
    ).toEqual({ ...blankFields, Hebrew: 'דג', Gender: 'm' });
  });

  describe('for a shown field the human edited', () => {
    test('sends the edit over what composition gives it, with each new line as a <br>', () => {
      expect(
        handOffFields({
          composed: { forms: 'pl: דָּגִים' },
          edits: { forms: 'f: דָּגָה\nm.pl: דָּגִים' },
          shownFields: ['forms'],
        }),
      ).toEqual({ ...blankFields, Forms: 'f: דָּגָה<br>m.pl: דָּגִים' });
    });
  });

  describe('for a hidden field the human edited', () => {
    test('ignores the edit', () => {
      expect(
        handOffFields({
          composed: { forms: 'pl: דָּגִים' },
          edits: { forms: 'f: דָּגָה', binyan: "pi'el" },
          shownFields: ['notes'],
        }),
      ).toEqual({ ...blankFields, Forms: 'pl: דָּגִים' });
    });
  });

  describe('with media', () => {
    const requested = 'paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437.jpg';
    const stored = 'paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437-1.jpg';
    const image = { filename: requested, blob: new Blob(['jpeg']) };
    const imageHtml = `<div><img src="${stored}"></div>`;
    const storedAs = new Map([[requested, stored]]);

    function media(changes: Partial<MediaDraft>): MediaDraft {
      return { ...emptyCardDraft().media, ...changes };
    }

    test('fills Images, which is never shown, with the names Anki used', () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: [],
          media: media({ images: [image, image] }),
          storedAs,
        }),
      ).toEqual({ ...blankFields, Images: `${imageHtml}${imageHtml}` });
    });

    test("puts a shown variant prompt's images after its text", () => {
      expect(
        handOffFields({
          composed: {},
          edits: { variant1Prompt: 'female dog' },
          shownFields: ['variant1Prompt'],
          media: media({ promptImages: { variant1Prompt: [image], variant2Prompt: [] } }),
          storedAs,
        }),
      ).toEqual({ ...blankFields, 'Variant 1 prompt': `female dog${imageHtml}` });
    });

    test('lets a variant prompt be only an image', () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: ['variant2Prompt'],
          media: media({ promptImages: { variant1Prompt: [], variant2Prompt: [image] } }),
          storedAs,
        }),
      ).toEqual({ ...blankFields, 'Variant 2 prompt': imageHtml });
    });

    test("ignores a hidden variant prompt's images", () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: ['notes'],
          media: media({ promptImages: { variant1Prompt: [image], variant2Prompt: [image] } }),
        }),
      ).toEqual(blankFields);
    });

    test('fills Audio with a sound under the name Anki used', () => {
      const recording = { filename: 'pronunciation_he_דג.mp3', blob: new Blob(['mp3']) };
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: [],
          media: media({ audio: recording }),
          storedAs: new Map([[recording.filename, 'pronunciation_he_דג-1.mp3']]),
        }),
      ).toEqual({ ...blankFields, Audio: '[sound:pronunciation_he_דג-1.mp3]' });
    });

    describe('when a file was never stored', () => {
      test('throws, rather than send a name Anki may not have', () => {
        expect(() =>
          handOffFields({
            composed: {},
            edits: {},
            shownFields: [],
            media: media({ images: [image] }),
          }),
        ).toThrow(`${requested} was never stored`);
      });
    });
  });
});

describe('attachmentsToStore', () => {
  const first = { filename: 'paste-a.jpg', blob: new Blob(['a']) };
  const second = { filename: 'paste-b.jpg', blob: new Blob(['b']) };
  const media: MediaDraft = {
    ...emptyCardDraft().media,
    images: [first],
    promptImages: { variant1Prompt: [second], variant2Prompt: [first] },
  };

  test('gives each file once, wherever else the note holds it', () => {
    expect(attachmentsToStore(media, ['variant1Prompt', 'variant2Prompt'])).toEqual([
      first,
      second,
    ]);
  });

  test("leaves out a hidden variant prompt's images", () => {
    expect(attachmentsToStore(media, ['notes'])).toEqual([first]);
  });

  test('gives the audio too', () => {
    const recording = { filename: 'pronunciation_he_דג.mp3', blob: new Blob(['mp3']) };
    expect(attachmentsToStore({ ...media, audio: recording }, ['notes'])).toEqual([
      first,
      recording,
    ]);
  });
});
