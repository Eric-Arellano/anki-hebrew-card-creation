import { describe, expect, test, vi } from 'vitest';
import { handle } from './hooks.server.ts';

function handleRequest(headers: Record<string, string>) {
  const resolve = vi.fn(async () => new Response('page'));
  const event = { request: new Request('http://127.0.0.1:5173/', { headers }) };
  return { response: handle({ event, resolve } as never), resolve };
}

describe('handle', () => {
  test('answers 403 to a refused request without resolving it', async () => {
    const { response, resolve } = handleRequest({ host: 'evil.example' });
    expect((await response).status).toBe(403);
    expect(await (await response).text()).toBe('Host must be 127.0.0.1 or localhost');
    expect(resolve).not.toHaveBeenCalled();
  });

  test('resolves an allowed request', async () => {
    const { response, resolve } = handleRequest({ host: '127.0.0.1:5173' });
    expect(await (await response).text()).toBe('page');
    expect(resolve).toHaveBeenCalledOnce();
  });
});
