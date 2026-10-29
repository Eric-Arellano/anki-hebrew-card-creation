export type LinkPlaceholder = 'word' | 'gloss';

export type LinkValues = Record<LinkPlaceholder, string>;

type Link = { id: string; label: string; template: `https://${string}` };

export const LINKS: readonly Link[] = [
  {
    id: 'wiktionary',
    label: 'Wiktionary',
    template: 'https://en.wiktionary.org/wiki/{word}#Hebrew',
  },
  { id: 'pealim', label: 'Pealim', template: 'https://www.pealim.com/search/?q={word}' },
  { id: 'forvo', label: 'Forvo', template: 'https://forvo.com/word/{word}/#he' },
  {
    id: 'images-en',
    label: 'Images (EN)',
    template: 'https://www.google.com/search?udm=2&q={gloss}',
  },
  {
    id: 'images-he',
    label: 'Images (HE)',
    template: 'https://www.google.com/search?udm=2&q={word}',
  },
];

const PLACEHOLDER = /\{(word|gloss)\}/g;

/** The placeholders `template` uses that are still blank in `values`, in template order. */
export function blankPlaceholders(template: string, values: LinkValues): LinkPlaceholder[] {
  return [...template.matchAll(PLACEHOLDER)]
    .map((match) => match[1] as LinkPlaceholder)
    .filter((name) => values[name].trim() === '');
}

/** The link for these values, or `undefined` while a placeholder the template uses is blank. */
export function buildLinkUrl(template: string, values: LinkValues): string | undefined {
  if (blankPlaceholders(template, values).length > 0) return undefined;
  return template.replace(PLACEHOLDER, (_, name: LinkPlaceholder) =>
    encodeURIComponent(values[name].trim()),
  );
}
