import { z } from 'zod';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A route refused the request, with SvelteKit's message and the status it answered with. */
export class RouteError extends Error {
  override name = 'RouteError';
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// The body SvelteKit's `error()` answers with.
const errorBodySchema = z.object({ message: z.string() });

async function failure(response: Response): Promise<RouteError> {
  const body = errorBodySchema.safeParse(await response.json().catch(() => undefined));
  const message = body.success ? body.data.message : `The server answered ${response.status}`;
  return new RouteError(message, response.status);
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw await failure(response);
  return (await response.json()) as T;
}

export async function getBlob(path: string): Promise<Blob> {
  const response = await fetch(path);
  if (!response.ok) throw await failure(response);
  return response.blob();
}

async function post(path: string, body: unknown): Promise<Response> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response);
  return response;
}

export async function postJson(path: string, body: unknown): Promise<void> {
  await post(path, body);
}

export async function postJsonForReply<T>(path: string, body: unknown): Promise<T> {
  return (await (await post(path, body)).json()) as T;
}
