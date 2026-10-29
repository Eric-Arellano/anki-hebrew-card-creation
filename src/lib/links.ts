// What a link searches with: the Hebrew word, or English such as a meaning or a variant's prompt.
export type LinkInput = 'hebrew' | 'english';

export type Link = {
  label: string;
  input: LinkInput;
  url: (encodedText: string) => `https://${string}`;
};

// Keyed by id, in the order the editor shows them.
export const LINKS = {
  wiktionary: {
    label: 'Wiktionary',
    input: 'hebrew',
    url: (text) => `https://en.wiktionary.org/wiki/${text}#Hebrew`,
  },
  pealim: {
    label: 'Pealim',
    input: 'hebrew',
    url: (text) => `https://www.pealim.com/search/?q=${text}`,
  },
  forvo: {
    label: 'Forvo',
    input: 'hebrew',
    url: (text) => `https://forvo.com/word/${text}/#he`,
  },
  'images-en': {
    label: 'Images (EN)',
    input: 'english',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
  'images-he': {
    label: 'Images (HE)',
    input: 'hebrew',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
} satisfies Record<string, Link>;

/** The link that searches `text`, or `undefined` while `text` is blank. */
export function buildLinkUrl(link: Link, text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  return link.url(encodeURIComponent(trimmed));
}
