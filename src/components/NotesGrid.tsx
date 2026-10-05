import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { CircleCheck, Search } from 'lucide-react';
import type { Note } from '../types/note';
import type { MonthPosition } from '../lib/NoteQueries';
import styles from './NotesGrid.module.css';

interface NotesGridProps {
  view: 'notes' | 'trash';
  search?: string;
  tab?: string;
  month?: MonthPosition;
  onOpenNote: (note: Note) => void;
  onViewChange: (view: 'notes' | 'trash') => void;
}

const periodLabels: Record<string, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
};

export function NotesGrid({ view, search = '', tab = 'all', month, onOpenNote, onViewChange }: NotesGridProps) {
  const { getNotes, deleteNote } = useNotes();

  const notes = getNotes(view === 'trash', search, tab, month ?? null);

  const hasSearch = search.trim().length > 0;

  if (notes.length === 0) {
    if (view === 'trash') {
      return (
        <div className={styles.emptyState}>
          <CircleCheck className={styles.emptyIcon} aria-hidden='true' />
          <h2>Trash is empty</h2>
          <p>Deleted notes stay here for 7 days before they disappear forever.</p>
          <button type='button' className={styles.emptyAction} onClick={() => onViewChange('notes')}>
            Back to All Notes
          </button>
        </div>
      );
    }

    if (hasSearch) {
      return (
        <div className={styles.emptyState}>
          <Search className={styles.emptyIcon} aria-hidden='true' />
          <h2>No notes found</h2>
          <p>Try a different search term or clear your search.</p>
        </div>
      );
    }

    return (
      <div className={styles.emptyState}>
        <h2>{tab === 'all' ? 'No notes yet' : `No notes for ${periodLabels[tab] ?? tab}`}</h2>
        <p>Your scribbles will appear here when you add one.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            view={view}
            onOpen={() => onOpenNote(note)}
            onToggleDelete={() => deleteNote(note.id)}
          />
        ))}
      </div>
    </div>
  );
}
