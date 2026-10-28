import { describe, expect, test, vi } from 'vitest';

describe('fetch', () => {
  test('rejects when no mock is installed', async () => {
    await expect(fetch('https://en.wiktionary.org/')).rejects.toThrow(
      'fetch(https://en.wiktionary.org/) was called without a mock',
    );
  });

  test('uses a mock a test installs', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }));
    expect((await fetch('https://en.wiktionary.org/')).status).toBe(404);
  });
});
