import {
  type Action,
  type AnkiClient,
  AnkiError,
  type Params,
  type Result,
} from '#lib/server/anki.ts';

type Handlers = { [A in Action]?: (params: Params[A]) => Result<A> };

/** An AnkiConnect that answers only the actions a test gives it, and records every call. */
export function fakeAnki(handlers: Handlers) {
  const calls: { action: Action; params: unknown }[] = [];
  const anki: AnkiClient = async (action, ...[params]) => {
    calls.push({ action, params });
    const handler = handlers[action] as ((params: unknown) => Result<typeof action>) | undefined;
    if (handler === undefined) throw new AnkiError(`the fake has no ${action}`);
    return handler(params);
  };
  return { anki, calls };
}

export function unreachable(): never {
  throw new AnkiError("Can't reach AnkiConnect at http://127.0.0.1:8765. Is Anki open?");
}
