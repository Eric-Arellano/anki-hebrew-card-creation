import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { AnkiStatus, ExistingNotes } from '#lib/api/anki.ts';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
import type { ForvoDownloads } from '#lib/api/forvo.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import CardEditor from './CardEditor.svelte';

export const connectedStatus: AnkiStatus = {
  kind: 'connected',
  ankiConnectVersion: 6,
  deckFound: true,
  noteType: {
    found: true,
    liveFieldNames: fieldNames,
    drift: { missingFromAnki: [], unexpectedInAnki: [] },
  },
};

export type ServerRequest = { method: string; path: string; body: unknown };

const notInDictionary: DictionaryLookup = {
  match: 'exact',
  candidates: [],
  titleHasEntry: false,
  staleIndex: false,
};

/** How the stub answers each route; a route left out answers as a connected Anki with no notes. */
export type ServerReplies = {
  status?: AnkiStatus;
  existing?: ExistingNotes;
  lookup?: DictionaryLookup | Response;
  storeMedia?: (body: { filename: string }) => Response;
  forvoDownloads?: (word: string) => ForvoDownloads;
  forvoFile?: (filename: string) => Response;
};

/** Our server, answering the editor's API calls, and recording every request. */
export function stubServer({
  status = connectedStatus,
  existing = { exactMatches: [], relatedMatches: [] },
  lookup = notInDictionary,
  storeMedia = ({ filename }) => Response.json({ filename }),
  forvoDownloads = () => ({ kind: 'found', downloads: [] }),
  forvoFile = () => new Response('mp3 bytes'),
}: ServerReplies = {}) {
  const requests: ServerRequest[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method: init?.method ?? 'GET', path: input, body });
    if (input === '/api/anki/status') return Response.json(status);
    if (input.startsWith('/api/anki/existing')) {
      return Response.json(existing);
    }
    if (input.startsWith('/api/lookup')) {
      return lookup instanceof Response ? lookup : Response.json(lookup);
    }
    if (input === '/api/anki/add') return new Response(null, { status: 204 });
    if (input === '/api/anki/media') return storeMedia(body);
    const url = new URL(input, 'http://127.0.0.1');
    if (url.pathname === '/api/forvo/downloads') {
      return Response.json(forvoDownloads(url.searchParams.get('word') ?? ''));
    }
    if (url.pathname === '/api/forvo/downloads/file') {
      return forvoFile(url.searchParams.get('filename') ?? '');
    }
    return new Response(null, { status: 404 });
  });
  return requests;
}

export function mediaRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/anki/media');
}

export function addRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/anki/add');
}

export async function renderConnectedEditor(replies: Omit<ServerReplies, 'status'> = {}) {
  const requests = stubServer(replies);
  render(CardEditor);
  await screen.findByText(/Connected to Anki/);
  return requests;
}

/** Says this word has no image, which a note needs unless it has one attached. */
export async function skipImage() {
  await fireEvent.click(screen.getByRole('checkbox', { name: 'No image for this word' }));
}

export function input(label: string) {
  return screen.getByLabelText(label) as HTMLInputElement;
}

export function noteField(fieldName: string) {
  return screen.getByLabelText(fieldName) as HTMLTextAreaElement;
}

export async function typeInto(element: HTMLElement, value: string) {
  await fireEvent.input(element, { target: { value } });
}

export async function choosePartOfSpeech(label: string) {
  await fireEvent.click(screen.getByRole('radio', { name: label }));
}

export async function chooseNoun(gender: string) {
  await choosePartOfSpeech('Noun');
  await fireEvent.click(screen.getByRole('radio', { name: gender }));
}

export async function fillInputs({
  word,
  pointed,
  gloss,
}: {
  word: string;
  pointed: string;
  gloss: string;
}) {
  await typeInto(input('Hebrew word, without niqqud'), word);
  await typeInto(input('English meaning'), gloss);
  await typeInto(input('Hebrew word, with niqqud'), pointed);
}

export async function fillVerb(binyan: string, root: string) {
  await choosePartOfSpeech('Verb');
  await fireEvent.change(screen.getByRole('combobox', { name: 'Binyan' }), {
    target: { value: binyan },
  });
  await typeInto(input('Root, like דבר or ד.ב.ר'), root);
}

export async function handOff(requests: ServerRequest[]) {
  await fireEvent.click(screen.getByRole('button', { name: 'Open in Anki' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Replace and open' }));
  await screen.findByText(/Opened in Anki/);
  return addRequests(requests)[0]?.body;
}

export async function fillDag() {
  await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
  await choosePartOfSpeech('Other');
}
