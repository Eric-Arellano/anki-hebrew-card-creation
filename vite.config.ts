import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The server can open Add windows in my Anki, so nothing off this machine may reach it.
  // `npm start` sets the same host for the built server, since adapter-node defaults to 0.0.0.0.
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },

  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Runes mode for our code only, not libraries. Removable in Svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      adapter: adapter(),
    }),
    // Resolves Svelte's browser build under Vitest and unmounts components after each test.
    svelteTesting(),
  ],
  test: {
    expect: { requireAssertions: true },
    // Only print logs for tests that fail.
    silent: 'passed-only',
    // Component tests opt into jsdom with a `@vitest-environment jsdom` comment.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Undoes every `vi.stubGlobal` after each test, so one test's `fetch` mock can't leak.
    unstubGlobals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
