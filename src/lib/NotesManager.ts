import type { Note, PendingOp } from '../types/note';
import { request } from '../lib/api';
import { filterNotes } from './NoteQueries';
import type { MonthPosition } from './NoteQueries';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function isTemporarySyncStatus(status: number): boolean {
  return [0, 401, 429, 502, 503, 504].includes(status);
}

export class NotesManager {
  notes: Note[] = [];
  pendingCache: Note[] = [];
  isAuthenticated: boolean = false;
  userId: string | null = null;
  serverHydrated: boolean = false;
  localMigrationDone: boolean = false;

  private onChange?: () => void;
  private inFlight = new Set<string>();
  private syncEpoch = 0;
  private hydrating = false;
  private isRefreshing = false;
  private lastRefreshAt = 0;
  private pendingDeletes: string[] = [];
  private isFlushingDeletes = false;

  constructor() {
    this.localMigrationDone = Boolean(localStorage.getItem('scribbly_migration_done'));

    const lastSession = readJSON<{ userId?: string } | null>('scribbly_last_session', null);

    if (lastSession?.userId) {
      this.userId = lastSession.userId;
      this.notes = this.loadSyncedNotes(lastSession.userId) || [];
      this.loadPendingDeletes();
    } else {
      this.loadLocalNotes();
    }

    this.cleanupTrash();
    const storedPending = readJSON<unknown>('scribbly_pending_cache', []);
    this.pendingCache = Array.isArray(storedPending) ? storedPending : [];

    window.addEventListener('online', () => {
      void this.flushPendingSync();
      void this.flushPendingDeletes();
    });
  }

  private normalizeNote(note: Partial<Note> & { _id?: string | number }): Note {
    const timestamp = typeof note.timestamp === 'number'
      ? note.timestamp
      : new Date(note.timestamp ?? Date.now()).getTime();

    return {
      ...note,
      id: note.id ?? note._id?.toString() ?? '',
      title: note.title ?? '',
      body: note.body ?? '',
      color: note.color ?? 'sun',
      date: note.date ?? '',
      time: note.time ?? '',
      timestamp,
      deleted: Boolean(note.deleted),
      deletedAt: note.deletedAt ? new Date(note.deletedAt).getTime() : null,
      pendingSync: false,
      pendingOp: null,
      syncAttempts: 0,
      syncError: false,
    };
  }

  private loadLocalNotes(): void {
    const stored = localStorage.getItem('scribbly_local_notes');

    if (stored === null) {
      this.notes = [];
      this.seedWelcomeNote();
    } else {
      const parsed = readJSON<unknown>('scribbly_local_notes', []);
      this.notes = Array.isArray(parsed)
        ? parsed.map((note) => this.normalizeNote(note)) : [];
    }
  }

  private loadSyncedNotes(userId: string | number) {
    const cached = readJSON<unknown>(`scribbly_synced_notes_${userId}`, null);
    return Array.isArray(cached) ? (cached as Note[]) : null;
  }

  public seedWelcomeNote(): void {
    this.addNote(
      'This note self-destructs...',
      "...it doesn't.\nbut it'd be really cool if it did.\nwelcome to Scribbly!",
      'sun'
    );
  }

  public async addNote(title: string, body: string, color: string): Promise<Note> {
    const dateObj = new Date();

    const newNote: Note = {
      id: Date.now().toString(),
      title,
      body,
      color,
      date: dateObj.toLocaleDateString('en-GB'),
      time: `${dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}, ${dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
      })}`,
      timestamp: dateObj.getTime(),
      deleted: false,
      deletedAt: null,
      pendingSync: true,
      pendingOp: 'create',
      syncAttempts: 0,
      syncError: false,
    };

    this.notes = [newNote, ...this.notes];
    this.save();

    if (this.isAuthenticated) {
      void this.syncNote(newNote);
    }

    return newNote;
  }

  private toPayload(note: Note): Partial<Note> {
    const payload: Partial<Note> = { ...note };
    delete payload.pendingSync;
    delete payload.pendingOp;
    delete payload.syncAttempts;
    delete payload.syncError;
    return payload;
  }

  private async sendNote(note: Note, op: PendingOp) {
    const trashRequest = () => request<{ note: Note }>(`/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted: note.deleted, deletedAt: note.deletedAt }),
    });

    if (op === 'trash') {
      return trashRequest();
    }

    if (op === 'create') {
      return request<{ note: Note }>('/notes', {
        method: 'POST',
        body: JSON.stringify(this.toPayload(note)),
      });
    }

    const updated = await request<{ note: Note }>(`/notes/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify(this.toPayload(note)),
    });

    // edited and trashed/restored before syncing: content goes first, then the delete state
    if (op === 'update_trash' && updated.ok) {
      return trashRequest();
    }

    return updated;
  }

  private replaceNote(note: Note): void {
    this.notes = this.notes.map((entry) => entry.id === note.id ? note : entry);
  }

  private async syncNote(note: Note): Promise<void> {
    if (this.inFlight.has(note.id)) {
      return;
    }
    this.inFlight.add(note.id);

    let outcome: { resend: Note | null; removed: boolean };
    try {
      outcome = await this.pushNote(note);
    } finally {
      this.inFlight.delete(note.id);
    }

    if (outcome.resend) {
      void this.syncNote(outcome.resend);
    }
    if (outcome.removed) {
      void this.flushPendingDeletes();
    }
  }

  private async pushNote(note: Note): Promise<{ resend: Note | null; removed: boolean }> {
    const op: PendingOp = note.pendingOp ?? 'create';
    const result = await this.sendNote(note, op);

    const current = this.notes.find((entry) => entry.id === note.id);
    if (!current) {
      // removed locally while sending (trash emptied), so its server copy may still need cleaning up
      return { resend: null, removed: true };
    }
    const editedMeanwhile = current !== note;

    if (!result.ok || !result.data.note) {
      if (!editedMeanwhile) {
        if (isTemporarySyncStatus(result.status)) {
          current.pendingSync = true;
        } else if (result.ok || result.status !== 0) {
          this.markSyncFailure(current, op);
        }
      } else if (op === 'create' && (current.pendingOp === 'update_trash' || current.pendingOp === 'trash')) {
        // the create never landed, so the note still needs a create (it carries the trash flag)
        this.replaceNote({ ...current, pendingOp: 'create' });
      }
      this.save();
      return { resend: null, removed: false };
    }

    this.syncEpoch += 1;
    const serverNote = this.normalizeNote(result.data.note);
    let resend: Note | null = null;

    if (!editedMeanwhile) {
      this.replaceNote(serverNote);
    } else if (current.pendingSync) {
      // the server has the note now, so a pending 'create' has to become an 'update'
      const next: Note = current.pendingOp === 'create'
        ? { ...current, pendingOp: 'update' }
        : current;
      this.replaceNote(next);
      resend = next;
    }

    this.save();
    return { resend, removed: false };
  }

  private pendingDeletesKey(): string | null {
    return this.userId ? `scribbly_pending_deletes_${this.userId}` : null;
  }

  private loadPendingDeletes(): void {
    const key = this.pendingDeletesKey();
    const stored = key ? readJSON<unknown>(key, []) : [];
    this.pendingDeletes = Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === 'string')
      : [];
  }

  private savePendingDeletes(): void {
    const key = this.pendingDeletesKey();
    if (!key) {
      return;
    }
    if (this.pendingDeletes.length > 0) {
      localStorage.setItem(key, JSON.stringify(this.pendingDeletes));
    } else {
      localStorage.removeItem(key);
    }
  }

  private dropPendingDeletes(notes: Note[]): Note[] {
    if (this.pendingDeletes.length === 0) {
      return notes;
    }
    const gone = new Set(this.pendingDeletes);
    return notes.filter((note) => !gone.has(note.id));
  }

  private async flushPendingDeletes(): Promise<void> {
    if (this.isFlushingDeletes || !this.isAuthenticated || this.pendingDeletes.length === 0) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    this.isFlushingDeletes = true;
    try {
      for (const id of [...this.pendingDeletes]) {
        // still being created or trashed on the server, retried when that request finishes
        if (this.inFlight.has(id)) {
          continue;
        }

        // the server only deletes trashed notes and this one's trash may not have synced yet,
        // so trash it first (404 means it's already gone)
        const trashed = await request(`/notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ deleted: true, deletedAt: Date.now() }),
        });

        let done = trashed.status === 404;
        if (trashed.ok) {
          const removed = await request(`/notes/${id}`, { method: 'DELETE' });
          done = removed.ok || removed.status === 404;
        }

        if (done) {
          this.pendingDeletes = this.pendingDeletes.filter((entry) => entry !== id);
          this.savePendingDeletes();
        }
      }
    } finally {
      this.isFlushingDeletes = false;
    }
  }

  private save(): void {
    if (this.userId) {
      this.savePendingCache();
      this.saveSyncedNotes();
    } else {
      localStorage.setItem('scribbly_local_notes', JSON.stringify(this.notes));
    }

    this.onChange?.();
  }

  private markSyncFailure(note: Note, op: PendingOp | null): void {
    note.pendingOp = note.pendingOp === 'create' ? 'create' : op;
    note.syncAttempts = (note.syncAttempts || 0) + 1;
    note.pendingSync = note.syncAttempts < 5;
    note.syncError = true;
  }

  private savePendingCache(): void {
    const pending = this.notes.filter((note) => note.pendingSync || note.syncError);
    const known = new Set(pending.map((note) => note.id));
    // notes still waiting to be merged back after login must survive a save in between
    const carried = this.pendingCache.filter((note) => !known.has(note.id));
    const toStore = [...pending, ...carried];
    if (toStore.length > 0) {
      localStorage.setItem('scribbly_pending_cache', JSON.stringify(toStore));
    } else {
      localStorage.removeItem('scribbly_pending_cache');
    }
  }

  private saveSyncedNotes(): void {
    if (!this.userId) {
      return;
    }
    localStorage.setItem(`scribbly_synced_notes_${this.userId}`, JSON.stringify(this.notes));
  }

  private clearAccountCache(userId: string): void {
    localStorage.removeItem(`scribbly_synced_notes_${userId}`);
    localStorage.removeItem('scribbly_pending_cache');
    localStorage.removeItem('scribbly_last_session');
  }

  public async updateNote(id: string, title: string, body: string, color: string): Promise<Note | null> {
    const note = this.notes.find((entry) => entry.id === id);
    if (!note || note.deleted) {
      return null;
    }

    const dateObj = new Date();
    const updatedNote: Note = {
      ...note,
      title,
      body,
      color,
      date: dateObj.toLocaleDateString('en-GB'),
      time: `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${dateObj.toLocaleDateString('en-US', { weekday: 'long' })}`,
      timestamp: dateObj.getTime(),
      pendingSync: true,
      pendingOp: note.pendingOp === 'create' ? 'create' : 'update',
    };

    this.notes = this.notes.map((entry) => entry.id === id ? updatedNote : entry);
    this.save();

    if (this.isAuthenticated) {
      void this.syncNote(updatedNote);
    }

    return updatedNote;
  }

  public async emptyTrash(): Promise<void> {
    const trashedNotes = this.notes.filter((note) => note.deleted);
    if (trashedNotes.length === 0) {
      return;
    }

    this.syncEpoch += 1;
    this.notes = this.notes.filter((note) => !note.deleted);

    if (this.isAuthenticated) {
      // remembered on disk so it still happens if we're offline or close the app first
      this.pendingDeletes = [...new Set([...this.pendingDeletes, ...trashedNotes.map((note) => note.id)])];
      this.savePendingDeletes();
    }

    this.save();
    await this.flushPendingDeletes();
  }

  public async deleteNote(id: string): Promise<Note | null> {
    const note = this.notes.find((entry) => entry.id === id);
    if (!note) {
      return null;
    }

    const nextDeleted = !note.deleted;
    const nextDeletedAt = nextDeleted ? Date.now() : null;
    const updatedNote: Note = {
      ...note,
      deleted: nextDeleted,
      deletedAt: nextDeletedAt,
      pendingSync: true,
      pendingOp: note.pendingOp === 'create' && !this.inFlight.has(id)
        ? 'create'
        : note.pendingOp && note.pendingOp !== 'trash' ? 'update_trash' : 'trash',
    };

    this.notes = this.notes.map((entry) => entry.id === id ? updatedNote : entry);
    this.save();

    if (this.isAuthenticated) {
      void this.syncNote(updatedNote);
    }

    return updatedNote;
  }

  private isFlushingSync: boolean = false;

  private async flushPendingSync(): Promise<void> {
    if (this.isFlushingSync) {
      return;
    }
    if (!this.isAuthenticated || typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    this.isFlushingSync = true;
    try {
      const pending = this.notes.filter((note) => note.pendingSync);

      for (const queued of pending) {
        // re-read it: it may have been edited, synced or removed while earlier notes were sending
        const latest = this.notes.find((entry) => entry.id === queued.id);
        if (latest?.pendingSync) {
          await this.syncNote(latest);
        }
      }

      this.serverHydrated = true;
      this.save();
    } finally {
      this.isFlushingSync = false;
    }
  }

  private async cleanupTrash(): Promise<void> {
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const initialLength = this.notes.length;
    const expiredNotes = this.notes.filter((note) => (
      note.deleted
      && note.deletedAt
      && (now - note.deletedAt) >= sevenDaysInMs
    ));

    this.notes = this.notes.filter((note) => {
      if (!note.deleted) return true;
      if (!note.deletedAt) return true;
      return (now - note.deletedAt) < sevenDaysInMs;
    });

    if (this.notes.length !== initialLength) {
      this.save();
    }

    if (this.isAuthenticated && expiredNotes.length > 0) {
      await Promise.all(expiredNotes.map(async (note) => {
        const result = await request(`/notes/${note.id}`, { method: 'DELETE' });
        if (!result.ok && result.status !== 404) {
          console.error(`Failed to permanently delete note ${note.id}`, result.data.error);
        }
      }));
    }
  }

  getNotes(isDeleted: boolean, search?: string, tab?: string, viewedMonth: MonthPosition | null = null): Note[] {
    return filterNotes(this.notes, isDeleted, search, tab, viewedMonth);
  }

  public hasUnsyncedNotes(): boolean {
    return this.notes.some((note) => note.pendingSync || note.syncError);
  }

  public async setAuthContext(isAuthenticated: boolean, userId: string | null = null): Promise<void> {
    const previousUserId = this.userId;
    const changed = this.isAuthenticated !== isAuthenticated || this.userId !== userId;
    this.isAuthenticated = isAuthenticated;
    this.userId = userId;

    if (!isAuthenticated) {
      this.serverHydrated = false;
      this.pendingDeletes = [];

      if (previousUserId) {
        this.clearAccountCache(previousUserId);
        this.pendingCache = [];
        this.loadLocalNotes();
      }

      this.save();
      return;
    }

    localStorage.setItem('scribbly_last_session', JSON.stringify({ userId }));

    if (previousUserId !== userId) {
      this.loadPendingDeletes();
    }

    if (changed || !this.serverHydrated) {
      this.hydrating = true;
      try {
        await this.syncWithServer();

        if (this.pendingCache.length > 0) {
          this.pendingCache.forEach((pendingNote) => {
            this.notes = [pendingNote, ...this.notes.filter((entry) => entry.id !== pendingNote.id)];
          });
          this.pendingCache = [];
        }

        if (this.notes.some((note) => note.syncError)) {
          this.notes = this.notes.map((note) => note.syncError
            ? { ...note, pendingSync: true, syncAttempts: 0 }
            : note);
          this.save();
        }
        await this.flushPendingSync();
        await this.flushPendingDeletes();
      } finally {
        this.hydrating = false;
      }
    }
  }

  private async syncWithServer() {
    if (!this.isAuthenticated) {
      return;
    }

    try {
      const result = await request<{ notes: Note[] }>('/notes');
      if (!result.ok) {
        if (result.status === 401) {
          this.isAuthenticated = false;
          this.serverHydrated = false;
          return;
        }

        const userId = this.userId;
        if (userId) {
          const cached = this.loadSyncedNotes(userId);
          if (cached) {
            this.notes = cached;
          }
        }
        return;
      }

      const fetched = (result.data.notes || []).map((note) => this.normalizeNote(note));
      const serverNotes = this.dropPendingDeletes(fetched);
      if (fetched.length > 0) {
        this.notes = serverNotes;
        await this.cleanupTrash();
        this.serverHydrated = true;
        this.save();
        return;
      }

      const localSnapshot = this.notes.map((note) => ({ ...note }));
      if (localSnapshot.length > 0 && !this.localMigrationDone) {
        this.notes = await this.uploadLocalNotes(localSnapshot);
        this.serverHydrated = true;
        this.save();
        return;
      }

      this.notes = [];
      this.serverHydrated = true;
      this.save();
    } catch (error) {
      console.error('Failed to sync notes with the server', error);
      const userId = this.userId;
      if (userId) {
        const cached = this.loadSyncedNotes(userId);
        if (cached) {
          this.notes = cached;
        }
      }
    }
  }

  private async uploadLocalNotes(notes: Note[]): Promise<Note[]> {
    if (!this.isAuthenticated || this.localMigrationDone) {
      return notes;
    }

    const uploaded: Note[] = [];

    for (const note of notes) {
      const withId: Note = {
        ...note,
        id: note.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };

      const result = await request('/notes', {
        method: 'POST',
        body: JSON.stringify(this.toPayload(withId)),
      });

      if (result.ok) {
        uploaded.push({ ...withId, pendingSync: false, pendingOp: null, syncAttempts: 0, syncError: false });
      } else {
        // not on the server yet, so leave it queued and let the normal flush retry it
        uploaded.push({ ...withId, pendingSync: true, pendingOp: 'create' });
      }
    }

    this.localMigrationDone = true;
    localStorage.setItem('scribbly_migration_done', 'true');
    return uploaded;
  }

  public async refreshFromServer(minIntervalMs = 15000): Promise<void> {
    if (!this.isAuthenticated || this.hydrating || this.isRefreshing || this.isFlushingSync) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }
    if (Date.now() - this.lastRefreshAt < minIntervalMs) {
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshAt = Date.now();
    const epochAtStart = this.syncEpoch;

    try {
      const result = await request<{ notes: Note[] }>('/notes');
      if (!result.ok) {
        return;
      }

      // a push or trash-empty finished while we were fetching, so this snapshot may be stale
      if (this.syncEpoch !== epochAtStart) {
        this.lastRefreshAt = 0;
        return;
      }

      const serverNotes = this.dropPendingDeletes((result.data.notes || []).map((note) => this.normalizeNote(note)));
      const serverIds = new Set(serverNotes.map((note) => note.id));

      // local edits that haven't reached the server yet always win
      const protectedNotes = this.notes.filter((note) => note.pendingSync || note.syncError);
      const protectedById = new Map(protectedNotes.map((note) => [note.id, note]));

      const merged = serverNotes.map((note) => protectedById.get(note.id) ?? note);
      const localOnly = protectedNotes.filter((note) => !serverIds.has(note.id));

      this.notes = [...localOnly, ...merged];
      this.serverHydrated = true;
      await this.cleanupTrash();
      this.save();
    } catch (error) {
      console.error('Failed to refresh notes', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  public setOnChange(callback: () => void): void {
    this.onChange = callback;
  }
}