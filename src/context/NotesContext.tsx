import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { NotesManager } from '../lib/NotesManager';
import type { Note } from '../types/note';

interface NotesContextValue {
  notes: Note[];
  addNote: NotesManager['addNote'];
  updateNote: NotesManager['updateNote'];
  deleteNote: NotesManager['deleteNote'];
  emptyTrash: NotesManager['emptyTrash'];
  getNotes: NotesManager['getNotes'];
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<NotesManager | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  if (managerRef.current === null) {
    managerRef.current = new NotesManager(() => {
      setNotes([...managerRef.current!.notes]);
    });
  }

  useEffect(() => {
    setNotes([...managerRef.current!.notes]);
  }, []);

  const value: NotesContextValue = {
    notes,
    addNote: (...args) => managerRef.current!.addNote(...args),
    updateNote: (...args) => managerRef.current!.updateNote(...args),
    deleteNote: (...args) => managerRef.current!.deleteNote(...args),
    emptyTrash: () => managerRef.current!.emptyTrash(),
    getNotes: (...args) => managerRef.current!.getNotes(...args),
  };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);

  if (!context) throw new Error('useNotes must be used within a NotesProvider');

  return context;
}