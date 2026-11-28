import { ankiFieldHtmlToText, textToAnkiFieldHtml } from '#lib/anki/html.ts';
import type { CardInputsDraft } from '#lib/card/inputs.ts';
import { formatRoot } from '#lib/hebrew/root.ts';
import type { WordUsage } from '#lib/hebrew/usage.ts';

export type FormLine = [label: string, form: string];

/** The `Forms` field: one `label: form` line each. A blank form is left out, not labelled. */
export function formsHtml(lines: readonly FormLine[]): string {
  return lines
    .map(([label, form]): FormLine => [label, form.trim()])
    .filter(([, form]) => form !== '')
    .map(([label, form]) => `${label}: ${textToAnkiFieldHtml(form)}`)
    .join('<br>');
}

/**
 * Each form in a `Forms` field by its label, as `formsHtml` wrote them. A line with no label is
 * left out, and of a label on two lines, the first.
 */
export function formsByLabel(html: string): ReadonlyMap<string, string> {
  const lines = html.split(/<br\s*\/?>/i).flatMap((line): FormLine[] => {
    // Unlike `formsFieldLines`, only labels like those `formsHtml` writes count, since what this
    // finds refills a part of speech's inputs, and a hand-typed line must not land in one.
    const match = ankiFieldHtmlToText(line).match(/^([a-z.]+):\s*(.*)$/s);
    return match?.[1] === undefined || match[2] === undefined ? [] : [[match[1], match[2]]];
  });
  return new Map(
    lines.filter(([label], index) => lines.findIndex(([other]) => other === label) === index),
  );
}

export type LabeledForm = { label: string; form: string };

function labeled(forms: Record<string, string>): LabeledForm[] {
  return Object.entries(forms).map(([label, form]) => ({ label, form }));
}

// A preposition's and other's are typed into `Forms` by hand, one `label: form` line each. Unlike
// `formsByLabel`, a line keeps any label or none, since every form typed is one the word takes.
function formsFieldLines(formsField: string): LabeledForm[] {
  return formsField.split('\n').map((line) => {
    const colon = line.indexOf(':');
    return colon === -1
      ? { label: '', form: line }
      : { label: line.slice(0, colon).trim(), form: line.slice(colon + 1) };
  });
}

function allLabeledForms(inputs: CardInputsDraft, formsField: string): LabeledForm[] {
  switch (inputs.partOfSpeech) {
    case 'noun':
      return labeled({
        plural: inputs.noun.plural,
        feminine: inputs.noun.feminine,
        'feminine plural': inputs.noun.femininePlural,
      });
    case 'verb':
      return labeled({
        'past (he)': inputs.verb.past,
        'present (he)': inputs.verb.present,
        'future (he)': inputs.verb.future,
      });
    case 'adjective':
      return labeled({
        feminine: inputs.adjective.feminine,
        'masculine plural': inputs.adjective.masculinePlural,
        'feminine plural': inputs.adjective.femininePlural,
      });
    case 'preposition':
    case 'other':
      return formsFieldLines(formsField);
    case 'adverb':
    case 'phrase':
    case undefined:
      return [];
  }
}

/** The word's other forms that the inputs and `Forms` hold, trimmed, leaving out the blank. */
export function labeledForms(inputs: CardInputsDraft, formsField: string): LabeledForm[] {
  return allLabeledForms(inputs, formsField)
    .map(({ label, form }) => ({ label, form: form.trim() }))
    .filter(({ form }) => form !== '');
}

/** The forms an example may use the word by: the word itself, pointed or not, and its others. */
export function wordUsage(inputs: CardInputsDraft, formsField: string): WordUsage {
  return {
    forms: [
      inputs.word,
      inputs.wordPointed,
      ...labeledForms(inputs, formsField).map(({ form }) => form),
    ],
    // A verb's forms are for “he”, while an example may conjugate it any way: `דיברתי` for
    // `לְדַבֵּר`.
    root: inputs.partOfSpeech === 'verb' ? formatRoot(inputs.root) : undefined,
  };
}
