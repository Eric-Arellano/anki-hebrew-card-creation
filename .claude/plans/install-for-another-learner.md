# Install for another learner

## Context

A second person wants to make cards with this tool for their own deck. They aren't an engineer
and won't keep a terminal open, so the app has to start on its own at login, survive a restart,
and update with one command that someone else runs for them.

They run it **locally on their own Mac**, against their own Anki desktop, exactly as the tool runs
today. Nothing about the security model changes: the server still listens only on `127.0.0.1`,
`request-guard.ts` still admits only loopback hosts, and AnkiConnect is still reached on this
machine. The work is packaging a long-running `npm start`, plus the one-time setup of their Anki.

Sharing notes between the two decks is out of scope. A later plan may add a way to pick new notes
and send them as an `.apkg`, or may lean on Anki's own export. One decision here sets that up:
their note type is imported from an export of the original deck, not rebuilt by hand (see
Decisions).

They use macOS. `npm run launch-agent install` keeps the built app running as a launchd user agent,
and the README's "Keep it running (macOS)" covers it; what's left is updating their copy and
setting up their Anki.

## Decisions

- **Local, not hosted.** The app already works this way, and it reads their Downloads folder for
  Forvo, which a hosted copy can't do.
  *Rejected: a hosted copy, with headless Anki in Docker reached over Tailscale, because it means
  exposing a server that writes notes, adding AnkiConnect's `sync` to the allowlist, and making
  the Anki URL and allowed hosts configurable. Revisit if they stop using Anki desktop.*
- **A launchd LaunchAgent runs `npm start`**, with `RunAtLoad` and `KeepAlive`, so it starts at
  login and restarts after a crash. launchd is built in, so there is no dependency to ask about.
  *Rejected: pm2 or forever, because each is a dependency for what launchd already does. Also
  rejected: a Login Items shell script, because it leaves a Terminal window open.*
- **The plist is generated at install time, never committed.** It needs absolute paths: the
  clone, the log in `~/Library/Logs`, and the Node install. AGENTS.md forbids home paths in
  code and config.
- **launchd gets `PATH` from where the terminal finds Node.** launchd starts agents with almost
  nothing, so the agent runs the `npm` in the first `PATH` directory holding both `node` and
  `npm`, with `PATH` set to that directory plus `/usr/bin:/bin`. For Homebrew that is the stable
  `/opt/homebrew/bin`, and for the official installer `/usr/local/bin`; a version manager's
  directory moves with each upgrade, which means installing the agent again. So for them, use the
  official installer or Homebrew.
  *Rejected: `process.execPath`, because Homebrew resolves it into a versioned Cellar directory
  that the next `brew upgrade` deletes.*
- **Forvo keeps reading Downloads under the agent.** macOS grants that to the `node` binary, so
  every script that binary runs may read Downloads, though nothing beyond it. That is no wider than
  a terminal that has already been allowed. Denying it costs only the automatic pickup: choosing or
  dropping the MP3 still works, because the browser reads the file, and the README says so.
  *Rejected: turning the pickup off for the agent, because denying the prompt already does that
  on whichever Mac wants it.*
- **Their note type comes from an `.apkg` export of the original deck**: one note, without
  scheduling. This copies the fields, templates and styling exactly, so `getAnkiStatus` reports
  no drift. It also keeps the note type's ID shared between the two collections, which is what
  lets a later `.apkg` of notes import into the existing note type instead of a renamed copy.
  *Rejected: recreating the fields by hand, because one typo shows up as drift, and the two
  note types would never match on import.*
- **Clone outside `~/Documents` and `~/Desktop`.** macOS asks before a process reads those, and
  iCloud may sync them. `data/` is large, and a background agent can't answer a permission prompt
  reliably.

**Open:** whose Anthropic key. The choice is their own Console account with their own spend
limit, or a separate key in its own workspace under the original account. The lean is the
separate workspace: they never touch the Console, and the cost stays visible and revocable.

## PR 1: One-command updates, and setting up another learner's Anki

- `npm run self-update`: `git pull --ff-only && npm ci && npm run build && npm run build-index &&
  npm run launch-agent restart`. It's named `self-update` because `npm update` and `npm upgrade`
  are npm's own commands. `--ff-only` makes a stray local edit fail loudly instead of merging.
  `build-index` runs every time: it takes seconds, and it means a change to the index's format
  never leaves their copy stale. The server is broken between `npm ci` and the restart, which is
  fine for one person.
- README: "Setting up another learner's Anki", as steps for whoever does the setup:
  - Install Anki desktop and AnkiConnect.
  - Turn off App Nap for Anki (`defaults write net.ankiweb.dtop NSAppSleepDisabled -bool
    true`, from AnkiConnect's own README), or AnkiConnect stalls while Anki is in the
    background. Check this is still needed with current Anki before writing it down.
  - Add Anki to Login Items.
  - Import the note type from the `.apkg`, then check that the Production card type's Deck
    Override points at *their* `Hebrew::Production`, since an override may not survive the
    import.
  - Point to the existing dictionary and `.env` steps rather than repeating them.

  Keep it to what someone runs; the reasons live in this plan's Decisions and in the code.

**Open:** whether macOS shows the Downloads permission prompt for the agent's `node`, or
denies it silently, and whether a Homebrew upgrade of Node asks again. If the prompt doesn't
appear, the fallback is granting `node` access under Privacy & Security › Files and Folders. Find
out on the first install, and write whichever is true in the README's Forvo line.

## Verification

- `npm run lint && npm run check && npm test`.
- On the original Mac first:
  - Run `npm run build` and `npm run launch-agent install`, and confirm the app loads.
  - Log out and back in, and confirm it's up without a terminal.
  - Kill the `node` process, and confirm launchd brings it back.
  - Confirm `restart` and `uninstall` both work.
  - Run `self-update` on a clean checkout.
- On the second Mac, follow only the README, without this plan. Anything the README missed is a
  README bug. Add a card, attach a Forvo download, and confirm the card reaches their phone after
  Anki syncs. Resolve the **Open:** items about Downloads and App Nap there.
