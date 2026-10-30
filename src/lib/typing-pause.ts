// Waits for typing to pause, so each keystroke doesn't send a request.
const TYPING_PAUSE_MS = 300;

/** What `request` answers once typing pauses on `typed`, or `undefined` if `latest()` moved on. */
export async function afterTypingPauses<T>(
  typed: string,
  latest: () => string,
  request: () => Promise<T>,
): Promise<T | undefined> {
  await new Promise((resolve) => setTimeout(resolve, TYPING_PAUSE_MS));
  // Typing went on, and the newer request replaces this one.
  if (latest() !== typed) return undefined;
  return request();
}
