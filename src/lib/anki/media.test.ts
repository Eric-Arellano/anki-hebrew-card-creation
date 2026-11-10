import { describe, expect, test } from 'vitest';
import { realField } from '#tests/real-notes.ts';
import {
  imagesToAnkiFieldHtml,
  soundsInAnkiField,
  soundToAnkiField,
  splitImages,
} from './media.ts';

describe('imagesToAnkiFieldHtml', () => {
  test('wraps each image in its own div', () => {
    expect(
      imagesToAnkiFieldHtml([
        'paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437.jpg',
        'paste-bc38c0336cc7bbc1cb96638340e10ed882aed1ea.jpg',
      ]),
    ).toBe(
      '<div><img src="paste-997ad7d7a4d8a304cb811c9453e72c85a2fe5437.jpg"></div>' +
        '<div><img src="paste-bc38c0336cc7bbc1cb96638340e10ed882aed1ea.jpg"></div>',
    );
  });

  test('is blank with no images', () => {
    expect(imagesToAnkiFieldHtml([])).toBe('');
  });

  test('escapes a name so it stays inside the attribute', () => {
    expect(imagesToAnkiFieldHtml(['a&b"><script>.jpg'])).toBe(
      '<div><img src="a&amp;b&quot;&gt;&lt;script&gt;.jpg"></div>',
    );
  });
});

describe('splitImages', () => {
  describe('in the wrappers the deck holds', () => {
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
      [
        'an image with an uppercase extension',
        realField('בית כנסת', 'Images'),
        ['Synagogue_Plzen_087.JPG'],
      ],
      ['two images on two lines', '<img src="a.jpg"><br><img src="b.png">', ['a.jpg', 'b.png']],
      ['an image in nested divs', '<div><div><img src="a.jpg"></div><br></div>', ['a.jpg']],
    ])('finds %s, and leaves no text', (_, html, images) => {
      expect(splitImages(html)).toEqual({ text: '', images });
    });

    test('keeps a variant prompt’s text, without the blank lines before its image', () => {
      expect(splitImages(realField('כלב', 'Variant 1 prompt'))).toEqual({
        text: 'female dog',
        images: [
          'shutterstock_628340135-cute-siberian-husky-puppy-with-flowers-on-a-pink-background-background-1.jpg',
        ],
      });
    });

    test('reads what composition writes', () => {
      expect(splitImages(`dog${imagesToAnkiFieldHtml(['a.jpg', 'b.jpg'])}`)).toEqual({
        text: 'dog',
        images: ['a.jpg', 'b.jpg'],
      });
    });
  });

  test('decodes a name, and finds it whatever quotes it', () => {
    expect(splitImages(`<img src="a&amp;b.jpg"><img src='c.jpg'><img src=d.jpg>`).images).toEqual([
      'a&b.jpg',
      'c.jpg',
      'd.jpg',
    ]);
  });

  test('reads past a > inside an alt', () => {
    expect(splitImages('<img alt="a > b" src="a.jpg">')).toEqual({ text: '', images: ['a.jpg'] });
  });

  test('keeps the line breaks and divs inside the text', () => {
    expect(splitImages('<div>one</div>two<br>three<br><img src="a.jpg">')).toEqual({
      text: '<div>one</div>two<br>three',
      images: ['a.jpg'],
    });
  });

  test('leaves an image with no file in the text', () => {
    expect(splitImages('<img alt="lost">')).toEqual({ text: '<img alt="lost">', images: [] });
  });

  test('is blank for a blank field', () => {
    expect(splitImages('')).toEqual({ text: '', images: [] });
  });
});

describe('soundToAnkiField', () => {
  test('keeps a Hebrew name as it is', () => {
    expect(soundToAnkiField('pronunciation_he_בית.mp3')).toBe('[sound:pronunciation_he_בית.mp3]');
  });

  test('escapes a name the way Anki does', () => {
    expect(soundToAnkiField('a&b.mp3')).toBe('[sound:a&amp;b.mp3]');
  });
});

describe('soundsInAnkiField', () => {
  test('reads a real Audio field', () => {
    expect(soundsInAnkiField(realField('בית ספר', 'Audio'))).toEqual([
      'pronunciation_he_בית_ספר.mp3',
    ]);
  });

  test('reads each sound in order, decoding what soundToAnkiField escaped', () => {
    expect(soundsInAnkiField(`${soundToAnkiField('a&b.mp3')}${soundToAnkiField('c.mp3')}`)).toEqual(
      ['a&b.mp3', 'c.mp3'],
    );
  });

  test('is empty for a blank field', () => {
    expect(soundsInAnkiField('')).toEqual([]);
  });
});
