import { describe, expect, test } from 'vitest';
import { htmlToText } from './html.ts';

describe('htmlToText', () => {
  test('turns line breaks into spaces and drops other tags', () => {
    expect(htmlToText('f: כַּלְבָּה<br>m.pl: כְּלָבִים<BR />f.pl: <b>כְּלָבוֹת</b>')).toBe(
      'f: כַּלְבָּה m.pl: כְּלָבִים f.pl: כְּלָבוֹת',
    );
  });

  test('decodes named and numeric entities', () => {
    expect(htmlToText('Facts &amp; more &lt;&gt; &quot;&apos;')).toBe(`Facts & more <> "'`);
    expect(htmlToText('&#1499;&#x5DC;&#X5D1;')).toBe('כלב');
    expect(htmlToText('pl:&nbsp;דָּגִים')).toBe(`pl:${String.fromCodePoint(0xa0)}דָּגִים`);
  });

  test('leaves an entity it does not know as it is', () => {
    expect(htmlToText('&bogus; &#99999999;')).toBe('&bogus; &#99999999;');
  });

  test('trims', () => {
    expect(htmlToText(' <div>דג</div> ')).toBe('דג');
  });
});
