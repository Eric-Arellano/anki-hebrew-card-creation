# Dictionary fixtures

`hebrew.jsonl` is 62 lines copied unchanged, in their original order, from kaikki.org's
[Hebrew extract](https://kaikki.org/dictionary/Hebrew/) of English Wiktionary
(`kaikki.org-dictionary-Hebrew.jsonl`, extracted on 2026-10-25 from the 2026-10-01 dump). Because it
has the real file's format, the index can be built from it as if it were the real file.

It holds every entry with these titles, except where a word is given:

- ספר: homographs across nouns and verbs, with defective spellings among them.
- אב, שנה, עיר and ערים, שולחן and שולחנות, עין and עיניים (only עַיִן, “eye”): irregular plurals
  and a dual, each with the form-of entry for that plural where Wiktionary has one.
- שלחן: the defective spelling of שולחן, which points back to it.
- דיבר, לדבר, דבר: a verb, its infinitive, and the defective spellings and imperative that share
  a title with the noun דָּבָר.
- דובר (only דֻּבַּר, “to be spoken”): a pu'al, which has no infinitive.
- חיכה, השתמש: verbs whose glosses name a governing preposition.
- כלב (only כֶּלֶב, “dog”), דלת (only דֶּלֶת, “door”): regular plurals.
- חתול (only חָתוּל, “cat”), כלבה, חתולה: feminine counterparts whose plural is only on the
  feminine's own entry, and a homograph of חתולה that doesn't point back at חָתוּל.
- מים: a noun that is only plural. רוח (only רוּחַ, “wind”): a noun of both genders.
- אמר (only the verb אָמַר): infinitives named by the head template rather than the conjugation.
- חדר (only the verb חָדַר): two infinitives.
- נשר (only the verb נָשַׁר): one pointed infinitive given two unpointed spellings. גווע: a head
  template naming biblical infinitives without ל.
- טייל: an infinitive whose link drops a doubled letter, to `לטיל`.
- ניגש: conjugation cells that hold two spellings, like `ייגש \ יִגַּשׁ`.
- שמים: a canonical form without niqqud. הרשאה: a canonical form wrapped in a direction control.
- חירשות: a root category with a sense label. רמקול: a blend, with two roots.
- הוציא, נולד: verbs whose conjugation stem isn't their root, against a `he-rootbox` and a root
  category. טלגרף: a stem split across arguments. התעלם: a stem that doesn't write a final letter.
  קעקע: a stem that is the root, against a category that isn't.
- אדרבא: senses with glosses beside an alt-of sense.
- חוץ מ־: a preposition whose title ends in a maqaf.
- גדול (only the adjective): an adjective whose forms are generated from a stem. אחר (only the
  adjective): an irregular feminine. ישראלי (only the adjective): two masculine plurals.

## License

The content is from [Wiktionary](https://en.wiktionary.org/), by Wiktionary's contributors, under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each entry's authors are listed
in the history of its page, `https://en.wiktionary.org/wiki/<word>`. The extraction is by
[wiktextract](https://github.com/tatuylonen/wiktextract) (Tatu Ylonen, “Wiktextract: Wiktionary as
Machine-Readable Structured Data”, LREC 2022). This directory keeps that license, not the
project's MIT license.
