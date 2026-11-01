import { GERESH_STAND_INS } from '#lib/hebrew/normalize.ts';

// Hebrew letters, without niqqud, which a root never carries. Only ג, ז and צ take a geresh, for the
// sounds of loanwords: פ־נ־צ׳־ר, and ץ׳ at the end of ק־ו־צ׳־ץ׳.
const ROOT_SHAPE = /^(?:[גזצץ]׳?|[א-ת])+$/;
const ROOT_LETTER = /[א-ת]׳?/g;

// Wiktionary writes them, but a Hebrew keyboard doesn't, so a typed root could never equal a dotted
// one. This does merge שׁ־כ־ר, “drunk”, with שׂ־כ־ר, “wage”, but no spelling can keep unrelated roots
// apart anyway: ע־ב־ר is “crossing” and “pregnancy” with no dot involved.
const SHIN_AND_SIN_DOTS = /[\u05C1\u05C2]/g;

// What people type between a root's letters, the maqaf included: ד.ב.ר, ד-ב-ר, ד ב ר, ד־ב־ר.
const SEPARATORS = /[.\-־\s]/g;

// A root's last letter takes its final form, ש־ל־ם, and no other does. Wiktionary and people both
// write ע־ל־מ too, but the same root must be the same text for a search to find it.
const FINAL_FORMS: Readonly<Record<string, string>> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };
const MEDIAL_FORMS: Readonly<Record<string, string>> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/** `text`'s letters joined by maqafs, as the deck's `Root` field holds them: `ד־ב־ר`. */
export function formatRoot(text: string): string | undefined {
  const root = text
    .normalize('NFC')
    .replace(SEPARATORS, '')
    .replace(SHIN_AND_SIN_DOTS, '')
    .replace(GERESH_STAND_INS, '׳');
  if (!ROOT_SHAPE.test(root)) return undefined;
  const letters = root.match(ROOT_LETTER) ?? [];
  return letters
    .map((letter, index) =>
      letter.replace(
        /^./,
        (base) => (index === letters.length - 1 ? FINAL_FORMS : MEDIAL_FORMS)[base] ?? base,
      ),
    )
    .join('־');
}
