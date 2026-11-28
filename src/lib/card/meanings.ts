// `Definitions` holds one meaning alone, or several numbered one a line, joined by `<br>`:
//
//   1. friend<br>2. companion
//
// A verb's meaning ends in the preposition it takes, drawn as a pill the card's Styling quizzes on
// the Production front, or in an empty marker for one that takes none:
//
//   1. to keep <span class="prep"><bdi lang="he">אֶת</bdi></span><br>2. to go<span class="no-prep"></span>
//
// The marker shows nothing on any card. It is there so a None the human chose reads back as None,
// where a line with neither, like any verb saved before prepositions were per meaning, reads back
// unchosen.
// *Rejected: telling None from unchosen by what else the note holds, because a verb saved before
// this can look exactly like one whose meanings all take none.*
// *Rejected: a separate field for prepositions, because it parts each one from its meaning.*
// *Rejected: parentheses, because Definitions already use them for English notes ("(computing) to
// save"), so a preposition in them is easy to skim past.*
import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';
import { isSamePointedText } from '#lib/hebrew/normalize.ts';
import {
  GOVERNED_PREPOSITIONS,
  type GovernedPreposition,
  POINTED_PREPOSITIONS,
} from '#lib/hebrew/preposition.ts';

export const PREPOSITION_CHOICES = [...GOVERNED_PREPOSITIONS, 'none'] as const;

export type PrepositionChoice = (typeof PREPOSITION_CHOICES)[number];

// A meaning as the editor holds it. The English is plain text, not HTML. Only a verb's meaning
// takes a preposition, absent until the human chooses one; another part of speech keeps it only so
// switching back to a verb loses nothing, and never writes it.
export type Meaning = { english: string; preposition?: PrepositionChoice };

type Lines<T> = readonly [T, ...T[]];

// Each meaning trimmed, in the order the human typed them. There is always a first one.
export type Meanings = Lines<{ english: string }>;

export type VerbMeanings = Lines<{ english: string; preposition: PrepositionChoice }>;

export function blankMeaning(): Meaning {
  return { english: '' };
}

export function isBlankMeaning({ english }: Meaning): boolean {
  return english.trim() === '';
}

/** Each meaning with English, trimmed, leaving out blank rows. */
export function filledMeanings(meanings: readonly Meaning[]): Meaning[] {
  return meanings
    .filter((meaning) => !isBlankMeaning(meaning))
    .map((meaning) => ({ ...meaning, english: meaning.english.trim() }));
}

/** The filled meanings' English alone, or `undefined` while there is none. */
export function completeMeanings(meanings: readonly Meaning[]): Meanings | undefined {
  const [first, ...rest] = filledMeanings(meanings).map(({ english }) => ({ english }));
  return first && [first, ...rest];
}

function isPrepositionChosen(meaning: Meaning): meaning is VerbMeanings[number] {
  return meaning.preposition !== undefined;
}

/** The filled meanings, or `undefined` while there is none or one's preposition is unchosen. */
export function completeVerbMeanings(meanings: readonly Meaning[]): VerbMeanings | undefined {
  const filled = filledMeanings(meanings);
  if (!filled.every(isPrepositionChosen)) return undefined;
  const [first, ...rest] = filled.map(({ english, preposition }) => ({ english, preposition }));
  return first && [first, ...rest];
}

function prepositionHtml(preposition: PrepositionChoice | undefined): string {
  if (preposition === undefined) return '';
  if (preposition === 'none') return '<span class="no-prep"></span>';
  return ` <span class="prep"><bdi lang="he">${POINTED_PREPOSITIONS[preposition]}</bdi></span>`;
}

function lineHtml({ english, preposition }: Meaning): string {
  return `${textToAnkiFieldHtml(english)}${prepositionHtml(preposition)}`;
}

export function meaningsToAnkiFieldHtml(meanings: Lines<Meaning>): string {
  if (meanings.length === 1) return lineHtml(meanings[0]);
  return meanings.map((meaning, index) => `${index + 1}. ${lineHtml(meaning)}`).join('<br>');
}

const PILL = /\s*<span class="prep"><bdi lang="he">([^<]*)<\/bdi><\/span>\s*$/;
const NO_PREP = /<span class="no-prep"><\/span>\s*$/;

function pointedPreposition(pointed: string): GovernedPreposition | undefined {
  return GOVERNED_PREPOSITIONS.find((preposition) =>
    isSamePointedText(POINTED_PREPOSITIONS[preposition], pointed),
  );
}

// A pill holding a preposition no chip offers stays in the English, so the human sees it.
function lineFromHtml(html: string): Meaning {
  if (NO_PREP.test(html)) {
    return { english: ankiFieldHtmlToText(html.replace(NO_PREP, '')), preposition: 'none' };
  }
  const pill = PILL.exec(html);
  const preposition = pill?.[1] === undefined ? undefined : pointedPreposition(pill[1]);
  if (preposition === undefined) return { english: ankiFieldHtmlToText(html) };
  return { english: ankiFieldHtmlToText(html.replace(PILL, '')), preposition };
}

/** Each meaning in a `Definitions` field, without the numbers composition adds. */
export function meaningsFromHtml(html: string): Meaning[] {
  const lines = html
    .split(/<br\s*\/?>/i)
    .map(lineFromHtml)
    .filter(({ english }) => english !== '');
  // Only a list numbered from 1 is one composition wrote, so a meaning like `1. Kings` stays.
  const numbered =
    lines.length > 1 && lines.every(({ english }, index) => english.startsWith(`${index + 1}. `));
  return lines.map((line) =>
    numbered ? { ...line, english: line.english.replace(/^\d+\. /, '') } : line,
  );
}
