import {
  type ActionParams,
  type ActionResult,
  type AllowedAction,
  type AnkiClient,
  AnkiError,
} from '#lib/server/anki/client.ts';

type FakeActionHandlers = {
  [A in AllowedAction]?: (params: ActionParams[A]) => ActionResult<A>;
};

/** An AnkiConnect that answers only the actions a test gives it, and records every call. */
export function fakeAnki(handlers: FakeActionHandlers) {
  const calls: { action: AllowedAction; params: unknown }[] = [];
  const anki: AnkiClient = async (action, ...[params]) => {
    calls.push({ action, params });
    const handler = handlers[action] as
      | ((params: unknown) => ActionResult<typeof action>)
      | undefined;
    // Not an AnkiError, which the code under test would catch and report as Anki failing.
    if (handler === undefined) throw new Error(`the fake has no ${action}`);
    return handler(params);
  };
  return { anki, calls };
}

/** An AnkiConnect that fails every action the way `createAnkiClient` does when Anki is closed. */
export const closedAnki: AnkiClient = async () => {
  throw new AnkiError("Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?");
};
