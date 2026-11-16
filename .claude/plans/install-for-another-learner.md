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

**Open:** their OS. This plan assumes macOS. On Windows, PR 1 would become a Task Scheduler entry
instead of a LaunchAgent.

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
  clone, the logs in `~/Library/Logs`, and the Node install. AGENTS.md forbids home paths in
  code and config. The installer reads them from `process.cwd()`, `os.homedir()` and
  `process.execPath`.
- **launchd gets `PATH` from the Node that ran the installer.** `npm start` needs `node` and `npm`
  on `PATH`, and launchd starts agents with almost nothing. The agent runs the `npm` beside
  `process.execPath`, with `PATH` set to that directory plus `/usr/bin:/bin`. That holds for
  the official installer, Homebrew and nvm alike. A Node upgrade that moves the binary means
  installing the agent again. So for them, use the official installer or Homebrew, not a
  version manager.
- **The pure plist builder lives in `src/lib/server/`, and the script in `scripts/` stays thin**,
  as `build-index` does. Vitest only collects `src/` and `tests/`, and the builder is what's worth
  testing: XML escaping of paths and the exact arguments.
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

## PR 1: Run the server as a LaunchAgent

- `src/lib/server/launch-agent.ts`: a pure `launchAgentPlist({ label, workingDirectory, nodeBin,
  logFile })` returning the plist XML. It runs `<nodeBin>/npm start` in `workingDirectory`, with
  `PATH` as above, sends stdout and stderr to `logFile`, and sets `RunAtLoad` and `KeepAlive`. The
  label is a constant (`local.anki-hebrew-card-creation`).
- `scripts/launch-agent.ts`, run as `npm run launch-agent <install|uninstall|restart>`:
  - `install` refuses if `build/` is missing or `npm` isn't beside `process.execPath`, and
    says why. Otherwise it writes the plist to `~/Library/LaunchAgents/`, then runs
    `launchctl bootout` (ignoring "not loaded") and `launchctl bootstrap gui/<uid>`.
  - `uninstall` runs `bootout` and deletes the plist.
  - `restart` runs `launchctl kickstart -k gui/<uid>/<label>`.

  It calls `launchctl` through `execFile`, never through a shell.
- Tests for the builder: the full XML for one input (`toEqual` on the string), and a path
  containing `&` and `<` that comes out escaped. Use paths that are clearly placeholders and
  not home paths, such as `/opt/example/…`.
- README, under Setup and running: "Keep it running (macOS)", covering install, where the log
  is, restart and uninstall. It also says that the bookmark is `http://127.0.0.1:3000` and that
  Anki desktop must be open to add cards.

**Open:** whether macOS shows the Downloads permission prompt for a LaunchAgent's `node`, or
denies it silently. The README already says Forvo's first look asks on behalf of the terminal.
If the prompt doesn't appear, the fallback is granting `node` access under Privacy & Security
› Files and Folders. Find out on the first install and write down whichever is true.

## PR 2: One-command updates, and setting up another learner's Anki

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
  Anki syncs. Resolve the two **Open:** items about Downloads and App Nap there.
