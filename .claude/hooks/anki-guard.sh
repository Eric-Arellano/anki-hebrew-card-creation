#!/usr/bin/env bash
# Guards Bash commands that reach AnkiConnect (port 8765), which talks to the human's real
# collection. Enforces the allowlist in AGENTS.md: read-only actions pass through to the normal
# permission flow, `guiAddCards`/`guiBrowse` prompt, and every other action is denied.
#
# *Rejected: an `ask` rule on `Bash(curl *:8765*)`, because it prompted on every read-only query
# and never covered a request sent any way other than curl.*
#
# It reads only literal `"action": "…"` pairs, so it catches mistakes, not deliberate disguise. A
# curl or wget naming no action (a body from `-d @file`, say) prompts rather than passes.

set -uo pipefail

command=$(jq -r '.tool_input.command // empty')
[[ $command == *8765* ]] || exit 0

decide() {
  jq -n --arg decision "$1" --arg reason "$2" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $decision,
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# The optional backslashes match JSON written inside a double-quoted shell string.
actions=$(grep -oE "\\\\?[\"']action\\\\?[\"'] *: *\\\\?[\"'][A-Za-z]*" <<<"$command" |
  sed -E "s/.*[\"']([A-Za-z]*)$/\1/")
if [[ -z $actions ]]; then
  # Without curl or wget it is source code that mentions the port, written through a heredoc.
  grep -qwE 'curl|wget' <<<"$command" || exit 0
  decide ask 'AnkiConnect request with no action this hook can read'
fi

gui=''
for action in $actions; do
  case $action in
    version | deckNames | modelNames | modelFieldNames | modelFieldDescriptions | modelTemplates | findNotes | notesInfo) ;;
    guiAddCards | guiBrowse) gui=$action ;;
    *) decide deny "AnkiConnect action $action is not on the allowlist in AGENTS.md" ;;
  esac
done

[[ -z $gui ]] || decide ask "AnkiConnect $gui changes what is open in your Anki"

exit 0
