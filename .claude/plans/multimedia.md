# Multimedia

**Draft.** Carried over from the Hebrew card helper plan as it closed; not yet designed.

## Context

The editor leaves `Images` and `Audio` blank: I paste media into Anki's Add window myself. The
tool already builds the links I find it through (Forvo, image search), and never fetches from a
third-party site itself.

## Forvo audio pickup

I download Forvo audio by hand. Forvo's API forbids caching audio, so it isn't used. The idea:
after I click the Forvo link, watch Downloads (`os.homedir()`, overridable) for a new
`pronunciation_he_<word>.mp3`, show it for me to confirm, and attach it through `guiAddCards`'
`audio` parameter.

*Rejected: checking from the server whether Forvo has the word, because Forvo answers 403 to
anything that isn't a browser.*
