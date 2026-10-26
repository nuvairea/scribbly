import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotesManager } from './NotesManager';
import type { Note } from '../types/note';

// A fake browser (localStorage, online/offline) and a fake server that follows the
// real scribbly-server rules: PUT only edits content, PATCH owns trash state, DELETE
// only removes notes that are already trashed, POST rejects duplicate ids.

interface ServerNote {
  id: string;
  title: string;
  body: string;
  color: string;
  date: string;
  time: string;
  timestamp: number;
  deleted: boolean;
  deletedAt: number | null;
}

interface FailPlan {
  method: string;
  status: number;
  count: number;
}

interface Hold {
  method: string;
  used: boolean;
  arrived: Promise<void>;
  released: Promise<void>;
  arrive: () => void;
  release: () => void;
}

type Json = Record<string, unknown>;

const EDITABLE_FIELDS = ['title', 'body', 'color', 'date', 'time', 'timestamp'] as const;

const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

function serverNote(id: string, body = 'old', extra: Partial<ServerNote> = {}): ServerNote {
  return {
    id,
    title: 't',
    body,
    color: 'sun',
    date: '',
    time: '',
    timestamp: 1000,
    deleted: false,
    deletedAt: null,
    ...extra,
  };
}

function makeEnv() {
  const store = new Map<string, string>();
  const onlineHandlers: Array<() => void> = [];
  const nav = { onLine: true };
  let offline = false;

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
  });
  vi.stubGlobal('window', {
    addEventListener: (event: string, handler: () => void) => {
      if (event === 'online') onlineHandlers.push(handler);
    },
  });
  vi.stubGlobal('navigator', nav);

  const notes = new Map<string, ServerNote>();
  const holds: Hold[] = [];
  const server = {
    notes,
    errors: 0,
    failNext: null as string | null,
    failPlan: null as FailPlan | null,
    // the server applies the request right away, but the reply waits until released
    hold(method: string): Hold {
      let resolveArrived = () => {};
      let resolveReleased = () => {};
      const hold: Hold = {
        method,
        used: false,
        arrived: new Promise<void>((resolve) => {
          resolveArrived = resolve;
        }),
        released: new Promise<void>((resolve) => {
          resolveReleased = resolve;
        }),
        arrive: () => resolveArrived(),
        release: () => resolveReleased(),
      };
      holds.push(hold);
      return hold;
    },
  };

  function apply(method: string, path: string, body: Json): { status: number; json: unknown } {
    const id = path.split('/')[2];

    const plan = server.failPlan;
    if (plan && plan.method === method && plan.count > 0) {
      plan.count -= 1;
      return { status: plan.status, json: { error: 'planned failure' } };
    }
    if (server.failNext === method) {
      server.failNext = null;
      server.errors += 1;
      return { status: 500, json: { error: 'boom' } };
    }

    if (method === 'GET' && path === '/notes') {
      return { status: 200, json: { notes: [...notes.values()].map((note) => ({ ...note })) } };
    }

    if (method === 'POST' && path === '/notes') {
      const noteId = String(body.id);
      if (notes.has(noteId)) {
        server.errors += 1;
        return { status: 500, json: { error: 'duplicate' } };
      }
      const created: ServerNote = {
        id: noteId,
        title: String(body.title ?? ''),
        body: String(body.body ?? ''),
        color: String(body.color ?? 'sun'),
        date: String(body.date ?? ''),
        time: String(body.time ?? ''),
        timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
        deleted: Boolean(body.deleted),
        deletedAt: typeof body.deletedAt === 'number' ? body.deletedAt : null,
      };
      notes.set(noteId, created);
      return { status: 201, json: { note: { ...created } } };
    }

    const existing = notes.get(id);

    if (method === 'PUT') {
      if (!existing) return { status: 404, json: { error: 'not found' } };
      for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) Object.assign(existing, { [field]: body[field] });
      }
      return { status: 200, json: { note: { ...existing } } };
    }

    if (method === 'PATCH') {
      if (!existing) return { status: 404, json: { error: 'not found' } };
      existing.deleted = Boolean(body.deleted);
      existing.deletedAt = existing.deleted
        ? typeof body.deletedAt === 'number' ? body.deletedAt : Date.now()
        : null;
      return { status: 200, json: { note: { ...existing } } };
    }

    if (method === 'DELETE') {
      if (!existing || !existing.deleted) return { status: 404, json: { error: 'not found' } };
      notes.delete(id);
      return { status: 200, json: { ok: true } };
    }

    return { status: 400, json: { error: 'bad request' } };
  }

  vi.stubGlobal('fetch', async (url: string, options: { method?: string; body?: string } = {}) => {
    if (offline) throw new TypeError('offline');

    const method = options.method ?? 'GET';
    const body = options.body ? (JSON.parse(options.body) as Json) : {};
    const result = apply(method, url.replace('/api', ''), body);

    const hold = holds.find((candidate) => !candidate.used && candidate.method === method);
    if (hold) {
      hold.used = true;
      hold.arrive();
      await hold.released;
    }

    if (offline) throw new TypeError('offline');
    return { ok: result.status < 400, status: result.status, json: async () => result.json };
  });

  return {
    store,
    server,
    goOffline: () => {
      offline = true;
      nav.onLine = false;
    },
    // network is back and the browser fires its 'online' event
    goOnline: () => {
      offline = false;
      nav.onLine = true;
      onlineHandlers.forEach((handler) => handler());
    },
    // network is back but no event fires (used to test pulls in between)
    quietOnline: () => {
      offline = false;
      nav.onLine = true;
    },
  };
}

interface BootOptions {
  serverNotes?: ServerNote[];
  localNotes?: ServerNote[];
  migrated?: boolean;
}

function boot(options: BootOptions = {}) {
  const env = makeEnv();
  if (options.migrated !== false) env.store.set('scribbly_migration_done', 'true');
  env.store.set('scribbly_local_notes', JSON.stringify(options.localNotes ?? []));
  (options.serverNotes ?? []).forEach((note) => env.server.notes.set(note.id, note));
  return { manager: new NotesManager(), ...env };
}

const find = (manager: NotesManager, id: string): Note | undefined =>
  manager.notes.find((note) => note.id === id);

const deleteQueue = (manager: NotesManager): string[] =>
  (manager as unknown as { pendingDeletes: string[] }).pendingDeletes;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('edits that overlap with a request', () => {
  it('keeps a newer edit made while an update is still in flight', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('PUT');
    await manager.updateNote('a', 't', 'edit1', 'sun');
    await hold.arrived;
    await manager.updateNote('a', 't', 'edit2', 'sun');
    hold.release();
    await settle();

    expect(find(manager, 'a')?.body).toBe('edit2');
    expect(find(manager, 'a')?.pendingSync).toBe(false);
    expect(server.notes.get('a')?.body).toBe('edit2');
  });

  it('does not POST twice when a note is edited while its create is in flight', async () => {
    const { manager, server } = boot();
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('POST');
    const note = await manager.addNote('t', 'v1', 'sun');
    await hold.arrived;
    await manager.updateNote(note.id, 't', 'v2', 'sun');
    hold.release();
    await settle();

    expect(server.errors).toBe(0);
    expect(server.notes.get(note.id)?.body).toBe('v2');
    expect(find(manager, note.id)?.body).toBe('v2');
    expect(find(manager, note.id)?.syncError).toBe(false);
  });

  it('trashes a note on the server when it was trashed while its create was in flight', async () => {
    const { manager, server } = boot();
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('POST');
    const note = await manager.addNote('t', 'v1', 'sun');
    await hold.arrived;
    await manager.deleteNote(note.id);
    hold.release();
    await settle();

    expect(server.notes.get(note.id)?.deleted).toBe(true);
  });

  it('still reaches the server as trashed when the create fails while the note is trashed', async () => {
    const { manager, server, goOnline } = boot();
    await manager.setAuthContext(true, 'u1');

    server.failPlan = { method: 'POST', status: 503, count: 1 };
    const hold = server.hold('POST');
    const note = await manager.addNote('t', 'slow note', 'sun');
    await hold.arrived;
    await manager.deleteNote(note.id);
    hold.release();
    await settle();
    goOnline();
    await settle();

    expect(server.notes.get(note.id)?.deleted).toBe(true);
  });
});

describe('working offline', () => {
  it('sends both the edit and the trash when a note is edited then trashed offline', async () => {
    const { manager, server, goOffline, goOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    goOffline();
    await manager.updateNote('a', 't', 'new', 'sun');
    await manager.deleteNote('a');
    await settle();
    goOnline();
    await settle();

    expect(server.notes.get('a')?.body).toBe('new');
    expect(server.notes.get('a')?.deleted).toBe(true);
    expect(find(manager, 'a')?.body).toBe('new');
  });

  it('puts a never-synced note in the trash instead of deleting it for good', async () => {
    const { manager, server, goOffline, goOnline } = boot();
    await manager.setAuthContext(true, 'u1');

    goOffline();
    const note = await manager.addNote('t', 'offline note', 'sun');
    await settle();
    await manager.deleteNote(note.id);
    await settle();
    expect(find(manager, note.id)?.deleted).toBe(true);

    goOnline();
    await settle();
    expect(server.notes.get(note.id)?.deleted).toBe(true);
    expect(server.errors).toBe(0);
  });

  it('restores a never-synced trashed note', async () => {
    const { manager, server, goOffline, goOnline } = boot();
    await manager.setAuthContext(true, 'u1');

    goOffline();
    const note = await manager.addNote('t', 'offline note', 'sun');
    await settle();
    await manager.deleteNote(note.id);
    await manager.deleteNote(note.id);
    await settle();
    goOnline();
    await settle();

    expect(server.notes.get(note.id)?.deleted).toBe(false);
    expect(find(manager, note.id)?.deleted).toBe(false);
    expect(server.errors).toBe(0);
  });

  it('leaves nothing behind when the trash is emptied on a never-synced note', async () => {
    const { manager, server, goOffline, goOnline } = boot();
    await manager.setAuthContext(true, 'u1');

    goOffline();
    const note = await manager.addNote('t', 'offline note', 'sun');
    await settle();
    await manager.deleteNote(note.id);
    await manager.emptyTrash();
    await settle();
    goOnline();
    await settle();

    expect(server.notes.has(note.id)).toBe(false);
    expect(find(manager, note.id)).toBeUndefined();
    expect(server.errors).toBe(0);
  });

  it('reports unsynced notes while offline and clears the flag after syncing', async () => {
    const { manager, goOffline, goOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');
    expect(manager.hasUnsyncedNotes()).toBe(false);

    goOffline();
    await manager.updateNote('a', 't', 'x', 'sun');
    await settle();
    expect(manager.hasUnsyncedNotes()).toBe(true);

    goOnline();
    await settle();
    expect(manager.hasUnsyncedNotes()).toBe(false);
  });
});

describe('server trouble', () => {
  it('does not use up the 5 attempts on 503s while the server wakes up', async () => {
    const { manager, server, goOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    server.failPlan = { method: 'PUT', status: 503, count: 6 };
    for (let i = 1; i <= 6; i++) {
      await manager.updateNote('a', 't', `edit${i}`, 'sun');
      await settle();
    }

    expect(find(manager, 'a')?.syncAttempts).toBe(0);
    expect(find(manager, 'a')?.pendingSync).toBe(true);

    goOnline();
    await settle();
    expect(server.notes.get('a')?.body).toBe('edit6');
  });

  it('retries a note that got stuck after 5 real failures on the next launch', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    server.failPlan = { method: 'PUT', status: 500, count: 5 };
    for (let i = 1; i <= 5; i++) {
      await manager.updateNote('a', 't', `e${i}`, 'sun');
      await settle();
    }
    const stuck = find(manager, 'a');
    expect(stuck?.pendingSync).toBe(false);
    expect(stuck?.syncError).toBe(true);

    const relaunched = new NotesManager();
    await relaunched.setAuthContext(true, 'u1');
    await settle();

    expect(server.notes.get('a')?.body).toBe('e5');
  });
});

describe('emptying the trash', () => {
  it('does not bring a note back live when it is trashed and emptied before the trash synced', async () => {
    const { manager, server, goOffline, goOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    goOffline();
    await manager.deleteNote('a');
    await manager.emptyTrash();
    await settle();
    goOnline();
    await settle();

    expect(server.notes.has('a')).toBe(false);
  });

  it('finishes the delete when emptied offline and the server already had it trashed', async () => {
    const { manager, server, goOffline, goOnline } = boot({
      serverNotes: [serverNote('b', 'x', { deleted: true, deletedAt: Date.now() })],
    });
    await manager.setAuthContext(true, 'u1');

    goOffline();
    await manager.emptyTrash();
    await settle();
    goOnline();
    await settle();

    expect(server.notes.has('b')).toBe(false);
  });

  it('keeps a note being deleted from reappearing when the app pulls from the server', async () => {
    const { manager, server, goOffline, goOnline, quietOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    goOffline();
    await manager.deleteNote('a');
    await manager.emptyTrash();
    await settle();
    quietOnline();
    await manager.refreshFromServer(0);
    expect(find(manager, 'a')).toBeUndefined();

    goOnline();
    await settle();
    expect(server.notes.has('a')).toBe(false);
  });

  it('remembers pending permanent deletes across an app restart', async () => {
    const { manager, server, goOffline, quietOnline } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    goOffline();
    await manager.deleteNote('a');
    await manager.emptyTrash();
    await settle();
    quietOnline();

    const relaunched = new NotesManager();
    await relaunched.setAuthContext(true, 'u1');
    await settle();

    expect(find(relaunched, 'a')).toBeUndefined();
    expect(server.notes.has('a')).toBe(false);
  });

  it('clears the delete queue when the trash is emptied while the trash request is in flight', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('PATCH');
    await manager.deleteNote('a');
    await hold.arrived;
    await manager.emptyTrash();
    hold.release();
    await settle();

    expect(server.notes.has('a')).toBe(false);
    expect(deleteQueue(manager)).toHaveLength(0);
  });
});

describe('signing in with guest notes', () => {
  it('uploads guest notes made this session exactly once', async () => {
    const { manager, server } = boot({ migrated: false });
    await manager.addNote('g', 'guest note', 'sun');
    await manager.setAuthContext(true, 'u1');
    await settle();

    expect(server.errors).toBe(0);
    expect([...server.notes.values()].some((note) => note.body === 'guest note')).toBe(true);
  });

  it('retries a failed guest upload instead of dropping the note', async () => {
    const { manager, server } = boot({
      migrated: false,
      localNotes: [serverNote('g1', 'one'), serverNote('g2', 'two')],
    });
    server.failNext = 'POST';
    await manager.setAuthContext(true, 'u1');
    await settle();

    expect(server.notes.has('g1')).toBe(true);
    expect(server.notes.has('g2')).toBe(true);
  });
});

describe('refreshing when you switch back to the app', () => {
  it('pulls changes made on another device', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    const remote = server.notes.get('a');
    if (remote) remote.body = 'edited elsewhere';
    server.notes.set('b', serverNote('b', 'new from other device'));
    await manager.refreshFromServer(0);

    expect(find(manager, 'a')?.body).toBe('edited elsewhere');
    expect(manager.notes).toHaveLength(2);
  });

  it('never overwrites a local edit that has not synced yet', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('PUT');
    await manager.updateNote('a', 't', 'local only', 'sun');
    await hold.arrived;
    const remote = server.notes.get('a');
    if (remote) remote.body = 'server version';
    await manager.refreshFromServer(0);

    expect(find(manager, 'a')?.body).toBe('local only');
    expect(find(manager, 'a')?.pendingSync).toBe(true);
    hold.release();
    await settle();
  });

  it('throws away a stale snapshot when a sync finishes during the fetch', async () => {
    const { manager, server } = boot({ serverNotes: [serverNote('a')] });
    await manager.setAuthContext(true, 'u1');

    const hold = server.hold('GET');
    const refreshing = manager.refreshFromServer(0);
    await hold.arrived;
    await manager.updateNote('a', 't', 'fresh edit', 'sun');
    await settle();
    hold.release();
    await refreshing;
    await settle();

    expect(find(manager, 'a')?.body).toBe('fresh edit');
  });
});

describe('bad local data', () => {
  it('does not crash on corrupted localStorage', () => {
    const env = makeEnv();
    env.store.set('scribbly_last_session', '{oops');
    env.store.set('scribbly_pending_cache', 'nope');
    env.store.set('scribbly_local_notes', '[[');

    expect(() => new NotesManager()).not.toThrow();
  });
});
