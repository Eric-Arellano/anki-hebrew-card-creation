import { z } from 'zod';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The body SvelteKit's `error()` answers with.
const errorBodySchema = z.object({ message: z.string() });

async function failureMessage(response: Response): Promise<string> {
  const body = errorBodySchema.safeParse(await response.json().catch(() => undefined));
  return body.success ? body.data.message : `The server answered ${response.status}`;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(await failureMessage(response));
  return (await response.json()) as T;
}

export async function postJson(path: string, body: unknown): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await failureMessage(response));
}
