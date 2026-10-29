import { describe, expect, test } from 'vitest';
import { ankiFieldHtmlToText } from './html.ts';

describe('ankiFieldHtmlToText', () => {
  test('turns line breaks into spaces and drops other tags', () => {
    expect(ankiFieldHtmlToText('f: כַּלְבָּה<br>m.pl: כְּלָבִים<BR />f.pl: <b>כְּלָבוֹת</b>')).toBe(
      'f: כַּלְבָּה m.pl: כְּלָבִים f.pl: כְּלָבוֹת',
    );
  });

  test('decodes named and numeric entities', () => {
    expect(ankiFieldHtmlToText('Facts &amp; more &lt;&gt; &quot;&apos;')).toBe(
      `Facts & more <> "'`,
    );
    expect(ankiFieldHtmlToText('&#1499;&#x5DC;&#X5D1;')).toBe('כלב');
    expect(ankiFieldHtmlToText('pl:&nbsp;דָּגִים')).toBe(`pl:${String.fromCodePoint(0xa0)}דָּגִים`);
  });

  test('leaves an entity it does not know as it is', () => {
    expect(ankiFieldHtmlToText('&bogus; &#99999999;')).toBe('&bogus; &#99999999;');
    expect(ankiFieldHtmlToText('&constructor; &toString;')).toBe('&constructor; &toString;');
  });

  test('trims', () => {
    expect(ankiFieldHtmlToText(' <div>דג</div> ')).toBe('דג');
  });
});
