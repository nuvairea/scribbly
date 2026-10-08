import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NotesManager } from '../lib/NotesManager';
import type { Note } from '../types/note';

export interface NotesContextValue {
  notes: Note[];
  addNote: NotesManager['addNote'];
  updateNote: NotesManager['updateNote'];
  deleteNote: NotesManager['deleteNote'];
  emptyTrash: NotesManager['emptyTrash'];
  getNotes: NotesManager['getNotes'];
  setAuthContext: NotesManager['setAuthContext'];
}

export const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<NotesManager | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  if (managerRef.current === null) {
    managerRef.current = new NotesManager();
  }

  useEffect(() => {
    managerRef.current!.setOnChange(() => {
      setNotes([...managerRef.current!.notes]);
    });
    setNotes([...managerRef.current!.notes]);
  }, []);

  const addNote = useCallback(
    (...args: Parameters<NotesManager['addNote']>) => managerRef.current!.addNote(...args),
    [],
  );
  const updateNote = useCallback(
    (...args: Parameters<NotesManager['updateNote']>) => managerRef.current!.updateNote(...args),
    [],
  );
  const deleteNote = useCallback(
    (...args: Parameters<NotesManager['deleteNote']>) => managerRef.current!.deleteNote(...args),
    [],
  );
  const emptyTrash = useCallback(() => managerRef.current!.emptyTrash(), []);
  const getNotes = useCallback(
    (...args: Parameters<NotesManager['getNotes']>) => managerRef.current!.getNotes(...args),
    [],
  );
  const setAuthContext = useCallback(
    (...args: Parameters<NotesManager['setAuthContext']>) => managerRef.current!.setAuthContext(...args),
    [],
  );

  const value = useMemo<NotesContextValue>(
    () => ({ notes, addNote, updateNote, deleteNote, emptyTrash, getNotes, setAuthContext }),
    [notes, addNote, updateNote, deleteNote, emptyTrash, getNotes, setAuthContext],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}
