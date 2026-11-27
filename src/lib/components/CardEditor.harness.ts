import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { CheckRequest, SuggestRequest, VerbMeaningsRequest } from '#lib/api/ai.ts';
import type { AnkiStatus, ExistingNotes, LoadedNote, SameMeaningNote } from '#lib/api/anki.ts';
import type { DictionaryCandidate, DictionaryLookup } from '#lib/api/dictionary.ts';
import type { ForvoDownloads } from '#lib/api/forvo.ts';
import type { Example } from '#lib/card/examples.ts';
import fieldNames from '#tests/fixtures/anki/model-field-names-hebrew.json' with { type: 'json' };
import { loadedNote } from '#tests/real-notes.ts';
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

/** כלב with its part of speech filled in, the one input the fixture lacks, and `fields` over it. */
export function kelevNote(fields: Record<string, string> = {}): LoadedNote {
  const note = loadedNote('כלב');
  return { ...note, fields: { ...note.fields, 'Part of speech': 'noun', ...fields } };
}

// As the lookup answers for the fixture dictionary.
export const kelevEntry: DictionaryCandidate = {
  id: 1,
  title: 'כלב',
  pointed: 'כֶּלֶב',
  wiktionaryPartOfSpeech: 'noun',
  definitions: ['dog', '(derogatory) scoundrel, bitch'],
  roots: [],
  partOfSpeech: 'noun',
  noun: {
    gender: { gender: 'm', pluralOnly: false },
    plurals: ['כְּלָבִים'],
    feminineSingulars: ['כַּלְבָּה'],
    femininePlurals: ['כְּלָבוֹת'],
  },
};

export type ServerRequest = { method: string; path: string; body: unknown };

type SaveBody = { fields: Record<string, string>; mod: number };
type AddBody = { fields: Record<string, string>; allowDuplicate: boolean };

// The id and `mod` are made up: the stub's notes never meet a real one.
function addedNote({ fields }: AddBody): Response {
  return Response.json({ noteId: 1, mod: 1, fields });
}

function savedNote(held: LoadedNote, { fields }: SaveBody): Response {
  return Response.json({ ...held, mod: held.mod + 1, fields: { ...held.fields, ...fields } });
}

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
  sameMeaning?: SameMeaningNote[];
  // The notes Anki holds, by id, joined by each one added; any other id answers 404.
  notes?: readonly LoadedNote[];
  // By default, a save writes its fields over the note and bumps its `mod`.
  saveNote?: (held: LoadedNote, body: SaveBody) => Response;
  // By default, Anki adds the note as sent.
  addNote?: (body: AddBody) => Response;
  lookup?: DictionaryLookup | Response;
  storeMedia?: (body: { filename: string }) => Response;
  forvoDownloads?: (word: string) => ForvoDownloads;
  forvoFile?: (filename: string) => Response;
  // By default, Claude suggests nothing and finds no problems.
  suggest?: (body: SuggestRequest) => Response | Promise<Response>;
  verbMeanings?: (body: VerbMeaningsRequest) => Response | Promise<Response>;
  check?: (body: CheckRequest, signal: AbortSignal | undefined) => Response | Promise<Response>;
};

/** Our server, answering the editor's API calls, and recording every request. */
export function stubServer({
  status = connectedStatus,
  existing = { exactMatches: [], sameRootMatches: [], relatedMatches: [] },
  sameMeaning = [],
  notes = [],
  saveNote = savedNote,
  addNote = addedNote,
  lookup = notInDictionary,
  storeMedia = ({ filename }) => Response.json({ filename }),
  forvoDownloads = () => ({ kind: 'found', downloads: [] }),
  forvoFile = () => new Response('mp3 bytes'),
  suggest = () => Response.json({}),
  verbMeanings = () => Response.json({ meanings: [] }),
  check = () => Response.json({ findings: [] }),
}: ServerReplies = {}) {
  const requests: ServerRequest[] = [];
  const held = [...notes];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
    requests.push({ method: init?.method ?? 'GET', path: input, body });
    if (input === '/api/anki/status') return Response.json(status);
    if (input.startsWith('/api/anki/existing')) {
      return Response.json(existing);
    }
    if (input.startsWith('/api/anki/same-meaning')) return Response.json(sameMeaning);
    if (input === '/api/anki/notes') {
      const response = addNote(body);
      if (response.ok) held.push(await response.clone().json());
      return response;
    }
    if (input.startsWith('/api/anki/notes/')) {
      const note = held.find(({ noteId }) => input === `/api/anki/notes/${noteId}`);
      if (note === undefined) {
        return Response.json({ message: 'Anki has no Hebrew note' }, { status: 404 });
      }
      return init?.method === 'POST' ? saveNote(note, body) : Response.json(note);
    }
    if (input.startsWith('/api/lookup')) {
      return lookup instanceof Response ? lookup : Response.json(lookup);
    }
    if (input === '/api/anki/media') return storeMedia(body);
    if (input === '/api/ai/suggest') return suggest(body);
    if (input === '/api/ai/verb-meanings') return verbMeanings(body);
    if (input === '/api/ai/check') return check(body, init?.signal ?? undefined);
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

export function saveRequests(requests: ServerRequest[]) {
  return requests.filter(
    (request) => request.method === 'POST' && request.path.startsWith('/api/anki/notes/'),
  );
}

export function addRequests(requests: ServerRequest[]) {
  return requests.filter((request) => request.path === '/api/anki/notes');
}

export async function renderConnectedEditor(
  replies: Omit<ServerReplies, 'status'> = {},
  note?: LoadedNote,
) {
  const requests = stubServer(replies);
  render(CardEditor, { note });
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

// A field's section can share its name, as Notes does. Examples is a fieldset of rows.
export function noteField(fieldName: string) {
  return screen.getByLabelText(fieldName, {
    selector: 'textarea, fieldset',
  }) as HTMLTextAreaElement;
}

/** Each row of Examples, as its inputs hold it. */
export function exampleRows(): Example[] {
  function values(side: string) {
    return screen
      .getAllByLabelText(new RegExp(`^Example \\d+ in ${side}$`))
      .map((element) => (element as HTMLInputElement).value);
  }
  const english = values('English');
  return values('Hebrew').map((hebrew, index) => ({ hebrew, english: english[index] ?? '' }));
}

export async function typeExample(row: number, { hebrew, english }: Example) {
  await typeInto(input(`Example ${row} in Hebrew`), hebrew);
  await typeInto(input(`Example ${row} in English`), english);
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

/** Clicks Check and add, then Add to deck, and answers with the body of the first add sent. */
export async function addToDeck(requests: ServerRequest[]) {
  await fireEvent.click(screen.getByRole('button', { name: 'Check and add' }));
  await claudeAnswered();
  await fireEvent.click(screen.getByRole('button', { name: 'Add to deck' }));
  await screen.findByText('Added to the deck.');
  return addRequests(requests)[0]?.body;
}

export async function fillDag() {
  await fillInputs({ word: 'דג', pointed: 'דָּג', gloss: 'fish' });
  await choosePartOfSpeech('Other');
}

/**
 * A reply the test sends once it has done what the human does while waiting, as `reply` for one of
 * Claude's routes, and the signal the editor sent the request with.
 */
export function heldReply<T>() {
  let send: (body: T) => void = () => {};
  let signal: AbortSignal | undefined;
  const reply = new Promise<Response>((resolve) => {
    send = (body) => resolve(Response.json(body));
  });
  return {
    reply: (_: unknown, sentWith?: AbortSignal) => {
      signal = sentWith;
      return reply;
    },
    send: (body: T) => send(body),
    signal: () => signal,
  };
}

/** Waits for Claude's check to answer, since the review can't be confirmed before it does. */
export async function claudeAnswered() {
  await waitFor(() => {
    if (document.querySelector('[aria-label="Claude\'s check"][aria-busy="true"]') !== null) {
      throw new Error('Claude is still checking');
    }
  });
}

export async function pressCmdEnter() {
  await fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
}

export function addButton() {
  return screen.getByRole('button', { name: 'Check and add' }) as HTMLButtonElement;
}
