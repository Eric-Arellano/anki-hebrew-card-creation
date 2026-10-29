import { parseConfig } from '#lib/config.ts';
import rawTestConfig from './fixtures/config.json' with { type: 'json' };

// The config the Anki fixtures were recorded under, so tests import this rather than `config`:
// editing the repo's `config.json` must not break them. Change it only alongside the fixtures.
export const testConfig = parseConfig(rawTestConfig);
