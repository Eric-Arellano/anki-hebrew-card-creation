import { appendFileSync, copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { DICTIONARY_FIXTURE } from '#tests/dictionary-index.ts';
import { buildIndex } from './build.ts';

const fixtureLines = readFileSync(DICTIONARY_FIXTURE, 'utf8').trim().split('\n').length;

let directory: string;
let paths: { source: string; index: string };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'hebrew-build-'));
  paths = { source: join(directory, 'hebrew.jsonl'), index: join(directory, 'hebrew.sqlite') };
});

afterEach(() => rmSync(directory, { recursive: true }));

describe('buildIndex', () => {
  test('counts the entries it indexes', async () => {
    copyFileSync(DICTIONARY_FIXTURE, paths.source);
    expect(await buildIndex(paths)).toEqual({ entries: fixtureLines, unreadableLines: 0 });
  });

  describe('for a file with blank and broken lines', () => {
    test('skips the blank ones and counts the broken ones', async () => {
      copyFileSync(DICTIONARY_FIXTURE, paths.source);
      // As a download cut off mid-line would leave it.
      appendFileSync(paths.source, '\n\n{"pos": "noun", "head_templates": [{"name"');
      expect(await buildIndex(paths)).toEqual({ entries: fixtureLines, unreadableLines: 1 });
    });
  });

  describe('without a dictionary file', () => {
    test('says where it looked', async () => {
      await expect(buildIndex(paths)).rejects.toThrow(`No dictionary at ${paths.source}`);
    });
  });
});
