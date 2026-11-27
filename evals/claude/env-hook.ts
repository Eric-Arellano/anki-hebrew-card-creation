// Node runs the eval without Vite, so nothing provides SvelteKit's `$app/env/private`, which
// `src/lib/server/ai/client.ts` imports. This stands in for it with the environment, which
// `--env-file=.env` fills.
import { registerHooks } from 'node:module';

const ENV_MODULE =
  'data:text/javascript,export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;';

registerHooks({
  resolve: (specifier, context, nextResolve) =>
    specifier === '$app/env/private'
      ? { url: ENV_MODULE, shortCircuit: true }
      : nextResolve(specifier, context),
});
