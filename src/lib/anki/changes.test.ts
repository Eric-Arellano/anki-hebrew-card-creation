import { describe, expect, test } from 'vitest';
import { realField } from '#tests/real-notes.ts';
import { changedFields } from './changes.ts';
import { ankiFieldHtmlToText, textToAnkiFieldHtml } from './html.ts';
import { imagesToAnkiFieldHtml } from './media.ts';

describe('changedFields', () => {
  describe('for a field that reads the same', () => {
    test.each([
      [
        'a bare image with an alt',
        realField('כלב', 'Images'),
        ['image-48258e0538aecfb7c668bfea2657cf398428fd72.jpg'],
      ],
      [
        'an image in a div',
        realField('בית', 'Images'),
        ['paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437.jpg'],
      ],
      ['an alt holding an entity', realField('דג', 'Images'), ['Porcupine-fish-Diodon-hystox.jpg']],
      ['two images on two lines', '<img src="a.jpg"><br><img src="b.png">', ['a.jpg', 'b.png']],
      ['an image in nested divs', '<div><div><img src="a.jpg"></div><br></div>', ['a.jpg']],
    ])('leaves out %s, written again by composition', (_, held, images) => {
      expect(changedFields({ Images: held }, { Images: imagesToAnkiFieldHtml(images) })).toEqual(
        {},
      );
    });

    test('leaves out a variant prompt with its image after blank lines', () => {
      const held = realField('כלב', 'Variant 1 prompt');
      const next = `female dog${imagesToAnkiFieldHtml([
        'shutterstock_628340135-cute-siberian-husky-puppy-with-flowers-on-a-pink-background-background-1.jpg',
      ])}`;
      expect(changedFields({ 'Variant 1 prompt': held }, { 'Variant 1 prompt': next })).toEqual({});
    });

    test('leaves out a prompt that is only text', () => {
      expect(
        changedFields({ 'Variant 2 prompt': 'a she-dog' }, { 'Variant 2 prompt': 'a she-dog' }),
      ).toEqual({});
    });

    test('leaves out a Pointed held on two lines, loaded and written back on one', () => {
      const held = realField('בית', 'Pointed');
      expect(held).toContain('<br>');
      const next = textToAnkiFieldHtml(ankiFieldHtmlToText(held));
      expect(changedFields({ Pointed: held }, { Pointed: next })).toEqual({});
    });

    test('leaves out Forms spaced with &nbsp;', () => {
      expect(
        changedFields(
          { Forms: realField('חתול', 'Forms') },
          { Forms: 'f: חֲתוּלָה<br>m.pl: חֲתוּלִים<br>f.pl: חֲתוּלוֹת' },
        ),
      ).toEqual({});
    });

    test('compares under NFC', () => {
      const pointed = 'כֶּלֶב';
      expect(
        changedFields({ Pointed: pointed.normalize('NFD') }, { Pointed: pointed.normalize('NFC') }),
      ).toEqual({});
    });

    test('leaves out a blank field the note doesn’t hold', () => {
      expect(changedFields({}, { Notes: '' })).toEqual({});
    });
  });

  describe('for a field that reads differently', () => {
    test('keeps changed text, as next has it', () => {
      expect(changedFields({ Hebrew: 'כלב', Gender: '' }, { Hebrew: 'כלב', Gender: 'm' })).toEqual({
        Gender: 'm',
      });
    });

    test('keeps a change of markup alone', () => {
      expect(changedFields({ Notes: 'dog' }, { Notes: '<b>dog</b>' })).toEqual({
        Notes: '<b>dog</b>',
      });
    });

    test('keeps images in a new order', () => {
      const next = imagesToAnkiFieldHtml(['b.jpg', 'a.jpg']);
      expect(
        changedFields({ Images: imagesToAnkiFieldHtml(['a.jpg', 'b.jpg']) }, { Images: next }),
      ).toEqual({ Images: next });
    });

    test('keeps a blanked field', () => {
      expect(changedFields({ Images: realField('כלב', 'Images') }, { Images: '' })).toEqual({
        Images: '',
      });
    });

    test('keeps text moved out of a prompt’s images', () => {
      const images = imagesToAnkiFieldHtml(['a.jpg']);
      expect(
        changedFields({ 'Variant 1 prompt': `dog${images}` }, { 'Variant 1 prompt': images }),
      ).toEqual({ 'Variant 1 prompt': images });
    });

    test('keeps a field the note doesn’t hold, once it is filled', () => {
      expect(changedFields({}, { constructor: 'x' })).toEqual({ constructor: 'x' });
    });
  });
});
