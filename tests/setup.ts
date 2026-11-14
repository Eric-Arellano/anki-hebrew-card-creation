import { beforeEach, vi } from 'vitest';

// The values `src/env.ts` defines, so a module that reads them imports in any test.
vi.mock('$app/env/private', () => ({
  ANTHROPIC_API_KEY: 'test-key',
  FORVO_DOWNLOADS: '/nonexistent/forvo-downloads',
}));

// No test reaches the network. A test that needs `fetch` stubs its own over this one, and
// `unstubGlobals` in vite.config.ts puts this one back afterwards.
beforeEach(() => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    throw new Error(`fetch(${String(input)}) was called without a mock`);
  });
});
