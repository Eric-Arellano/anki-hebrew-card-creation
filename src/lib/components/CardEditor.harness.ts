import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { AnkiStatus, ExistingNotes } from '#lib/api/anki.ts';
import type { DictionaryLookup } from '#lib/api/dictionary.ts';
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

/** Our server, answering the editor's API calls, and recording every request. */
export function stubServer(
  status: AnkiStatus = connectedStatus,
  existing: ExistingNotes = { exactMatches: [], relatedMatches: [] },
  lookup: DictionaryLookup | Response = notInDictionary,
  storeMedia: (body: { filename: string }) => Response = ({ filename }) =>
    Response.json({ filename }),
) {
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

export async function renderConnectedEditor(
  existing?: ExistingNotes,
  lookup?: DictionaryLookup | Response,
) {
  const requests = stubServer(connectedStatus, existing, lookup);
  render(CardEditor);
  await screen.findByText(/Connected to Anki/);
  return requests;
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
