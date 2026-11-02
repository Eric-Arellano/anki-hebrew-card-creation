import { describe, expect, test } from 'vitest';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { handOffFields } from './hand-off.ts';

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

  describe('with stored media', () => {
    const image = 'paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437.jpg';
    const imageHtml = `<div><img src="${image}"></div>`;

    test('fills Images and Audio, which are never shown', () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: [],
          media: { images: [image, image], audio: 'pronunciation_he_בית.mp3' },
        }),
      ).toEqual({
        ...blankFields,
        Images: `${imageHtml}${imageHtml}`,
        Audio: '[sound:pronunciation_he_בית.mp3]',
      });
    });

    test("puts a shown variant prompt's images after its text", () => {
      expect(
        handOffFields({
          composed: {},
          edits: { variant1Prompt: 'female dog' },
          shownFields: ['variant1Prompt'],
          media: { variant1Prompt: [image] },
        }),
      ).toEqual({ ...blankFields, 'Variant 1 prompt': `female dog${imageHtml}` });
    });

    test('lets a variant prompt be only an image', () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: ['variant2Prompt'],
          media: { variant2Prompt: [image] },
        }),
      ).toEqual({ ...blankFields, 'Variant 2 prompt': imageHtml });
    });

    test("ignores a hidden variant prompt's images", () => {
      expect(
        handOffFields({
          composed: {},
          edits: {},
          shownFields: ['notes'],
          media: { variant1Prompt: [image], variant2Prompt: [image] },
        }),
      ).toEqual(blankFields);
    });
  });
});
