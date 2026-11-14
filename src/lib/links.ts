type Link = {
  label: string;
  url: (encodedText: string) => `https://${string}`;
};

// Each is shown beside what it feeds. An image search is labelled by the text it searches, under
// "Search images", so its own label shows only while that text is blank.
export const LINKS = {
  wiktionary: {
    label: 'Wiktionary',
    url: (text) => `https://en.wiktionary.org/wiki/${text}#Hebrew`,
  },
  pealim: {
    label: 'Pealim',
    url: (text) => `https://www.pealim.com/search/?q=${text}`,
  },
  forvo: {
    label: 'Forvo',
    url: (text) => `https://forvo.com/word/${text}/#he`,
  },
  'images-en': {
    label: 'English',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
  'images-he': {
    label: 'Hebrew',
    url: (text) => `https://www.google.com/search?udm=2&q=${text}`,
  },
} satisfies Record<string, Link>;

/** The link that searches `text`, or `undefined` while `text` is blank. */
export function buildLinkUrl(link: Link, text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  return link.url(encodeURIComponent(trimmed));
}
