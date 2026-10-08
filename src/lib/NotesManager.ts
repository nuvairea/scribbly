import type { Note, PendingOp } from '../types/note';
import { request } from '../lib/api';
import { filterNotes } from './NoteQueries';
import type { MonthPosition } from './NoteQueries';

export class NotesManager {
  notes: Note[] = [];
  pendingCache: Note[] = [];
  isAuthenticated: boolean = false;
  userId: string | null = null;
  serverHydrated: boolean = false;
  localMigrationDone: boolean = false;

  private onChange?: () => void;

  constructor() {
    this.localMigrationDone = Boolean(localStorage.getItem('scribbly_migration_done'));

    const lastSession = JSON.parse(localStorage.getItem('scribbly_last_session') || 'null');

    if (lastSession) {
      this.notes = this.loadSyncedNotes(lastSession.userId) || [];
    } else {
      this.loadLocalNotes();
    }

    this.cleanupTrash();
    this.pendingCache = JSON.parse(localStorage.getItem('scribbly_pending_cache') || '[]');

    window.addEventListener('online', () => this.flushPendingSync());
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
      color: note.color ?? '#e9e381',
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
      const parsed = JSON.parse(stored) || [];
      this.notes = Array.isArray(parsed)
        ? parsed.map((note) => this.normalizeNote(note)) : [];
    }
  }

  private loadSyncedNotes(userId: string | number) {
    const cached = localStorage.getItem(`scribbly_synced_notes_${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  public seedWelcomeNote(): void {
    this.addNote(
      'This note self-destructs...',
      "...it doesn't.\nbut it'd be really cool if it did.\nwelcome to Scribbly!",
      '#e9e381'
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

  private async syncNote(note: Note): Promise<void> {
    const op = note.pendingOp ?? 'create';

    const result = op === 'trash'
      ? await request<{ note: Note }>(`/notes/${note.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted: note.deleted, deletedAt: note.deletedAt }),
      })
      : await request<{ note: Note }>(
        op === 'update' ? `/notes/${note.id}` : '/notes',
        {
          method: op === 'create' ? 'POST' : 'PUT',
          body: JSON.stringify(note),
        }
      );

    if (!result.ok) {
      this.markSyncFailure(note, op, result);
      this.save();
      return;
    }

    if (!result.data.note) {
      this.markSyncFailure(note, op, { ok: false, status: result.status });
      this.save();
      return;
    }

    const serverNote = this.normalizeNote(result.data.note);
    this.notes = [serverNote, ...this.notes.filter((entry) => entry.id !== serverNote.id)];
    this.save();
  }

  private save(): void {
    if (this.isAuthenticated) {
      this.savePendingCache();
      this.saveSyncedNotes();
    } else {
      localStorage.setItem('scribbly_local_notes', JSON.stringify(this.notes));
    }

    this.onChange?.();
  }

  private markSyncFailure(note: Note, op: PendingOp | null, result:
    { ok: boolean; status: number }): void {
    note.pendingOp = note.pendingOp === 'create' ? 'create' : op;
    note.syncAttempts = (note.syncAttempts || 0) + 1;
    note.pendingSync = note.syncAttempts < 5;
    note.syncError = true;
  }

  private savePendingCache(): void {
    const pending = this.notes.filter((note) => note.pendingSync || note.syncError);
    if (pending.length > 0) {
      localStorage.setItem('scribbly_pending_cache', JSON.stringify(pending));
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

    this.notes = this.notes.filter((note) => !note.deleted);
    this.save();

    if (this.isAuthenticated) {
      await Promise.all(trashedNotes.map(async (note) => {
        const result = await request(`/notes/${note.id}`, { method: 'DELETE' });
        if (!result.ok && result.status !== 404) {
          console.error(`Failed to permanently delete note ${note.id}`, result.data);
        }
      }));
    }
  }

  public async deleteNote(id: string): Promise<Note | null> {
    const note = this.notes.find((entry) => entry.id === id);
    if (!note) {
      return null;
    }

    if (this.isAuthenticated && note.pendingOp === 'create' && note.pendingSync) {
      this.notes = this.notes.filter((entry) => entry.id !== id);
      this.save();
      return null;
    }

    const nextDeleted = !note.deleted;
    const nextDeletedAt = nextDeleted ? Date.now() : null;
    const updatedNote: Note = {
      ...note,
      deleted: nextDeleted,
      deletedAt: nextDeletedAt,
      pendingSync: true,
      pendingOp: 'trash',
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

      for (const note of pending) {
        let result;
        const { pendingSync: _p, pendingOp: _o, syncError: _s, ...payload } = note;

        if (note.pendingOp === 'trash') {
          result = await request<{ note: Note }>(`/notes/${note.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ deleted: note.deleted, deletedAt: note.deletedAt }),
          });
        } else if (note.pendingOp === 'update') {
          result = await request<{ note: Note }>(`/notes/${note.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          result = await request<{ note: Note }>('/notes', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }

        if (result.ok) {
          const serverNote = this.normalizeNote(result.data.note);
          this.notes = this.notes.map((entry) => entry.id === note.id ? serverNote : entry);
        } else if (result.status !== 0) {
          this.markSyncFailure(note, note.pendingOp, result);
          this.notes = this.notes.map((entry) => entry.id === note.id ? note : entry);
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

  public async setAuthContext(isAuthenticated: boolean, userId: string | null = null): Promise<void> {
    const changed = this.isAuthenticated !== isAuthenticated || this.userId !== userId;
    this.isAuthenticated = isAuthenticated;
    this.userId = userId;

    if (!isAuthenticated) {
      this.serverHydrated = false;
      this.save();
      return;
    }

    if (changed || !this.serverHydrated) {
      await this.syncWithServer();

      if (this.pendingCache.length > 0) {
        this.pendingCache.forEach((pendingNote) => {
          this.notes = [pendingNote, ...this.notes.filter((entry) => entry.id !== pendingNote.id)];
        });
        this.pendingCache = [];
      }

      await this.flushPendingSync();
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

      const serverNotes = (result.data.notes || []).map((note) => this.normalizeNote(note));
      if (serverNotes.length > 0) {
        this.notes = serverNotes;
        await this.cleanupTrash();
        this.serverHydrated = true;
        this.save();
        return;
      }

      const localSnapshot = this.notes.map((note) => ({ ...note }));
      if (localSnapshot.length > 0 && !this.localMigrationDone) {
        await this.uploadLocalNotes(localSnapshot);
        this.notes = localSnapshot;
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

  private async uploadLocalNotes(notes: Note[]): Promise<void> {
    if (!this.isAuthenticated || this.localMigrationDone) {
      return;
    }

    for (const note of notes) {
      const payload = {
        ...note,
        id: note.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };

      await request('/notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    this.localMigrationDone = true;
    localStorage.setItem('scribbly_migration_done', 'true');
  }

  public setOnChange(callback: () => void): void {
    this.onChange = callback;
  }
}