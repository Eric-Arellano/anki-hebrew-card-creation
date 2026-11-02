import { describe, expect, test } from 'vitest';
import { imagesToAnkiFieldHtml, soundToAnkiField } from './media.ts';

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

describe('soundToAnkiField', () => {
  test('keeps a Hebrew name as it is', () => {
    expect(soundToAnkiField('pronunciation_he_בית.mp3')).toBe('[sound:pronunciation_he_בית.mp3]');
  });

  test('escapes a name the way Anki does', () => {
    expect(soundToAnkiField('a&b.mp3')).toBe('[sound:a&amp;b.mp3]');
  });
});
