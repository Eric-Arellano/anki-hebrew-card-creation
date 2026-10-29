export type LinkInput = 'word' | 'gloss';

export type LinkValues = Record<LinkInput, string>;

/** Each link is searched with one input, which the editor must have before it can link. */
export type Link = {
  id: string;
  label: string;
  input: LinkInput;
  url: (encodedText: string) => `https://${string}`;
};

export const LINKS: readonly Link[] = [
  {
    id: 'wiktionary',
    label: 'Wiktionary',
    input: 'word',
    url: (text) => `https://en.wiktionary.org/wiki/${text}#Hebrew`,
  },
  {
    id: 'pealim',
    label: 'Pealim',
    input: 'word',
    url: (text) => `https://www.pealim.com/search/?q=${text}`,
  },
  {
    id: 'forvo',
    label: 'Forvo',
    input: 'word',
    url: (text) => `https://forvo.com/word/${text}/#he`,
  },
  {
    id: 'images-en',
    label: 'Images (EN)',
    input: 'gloss',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
  {
    id: 'images-he',
    label: 'Images (HE)',
    input: 'word',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
];

/** The link for these values, or `undefined` while the input the link searches with is blank. */
export function buildLinkUrl(link: Link, values: LinkValues): string | undefined {
  const text = values[link.input].trim();
  if (text === '') return undefined;
  return link.url(encodeURIComponent(text));
}
