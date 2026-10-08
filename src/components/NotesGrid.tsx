import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { CircleCheck, Search } from 'lucide-react';
import type { Note } from '../types/note';
import type { MonthPosition } from '../lib/NoteQueries';
import styles from './NotesGrid.module.css';
import { AnimatePresence, motion } from 'motion/react';

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

  const emptyState =
    view === 'trash' ? (
      <>
        <CircleCheck className={styles.emptyIcon} aria-hidden='true' />
        <h2>Trash is empty</h2>
        <p>Deleted notes stay here for 7 days before they disappear forever.</p>
        <button type='button' className={styles.emptyAction} onClick={() => onViewChange('notes')}>
          Back to All Notes
        </button>
      </>
    ) : hasSearch ? (
      <>
        <Search className={styles.emptyIcon} aria-hidden='true' />
        <h2>No notes found</h2>
        <p>Try a different search term or clear your search.</p>
      </>
    ) : (
      <>
        <h2>{tab === 'all' ? 'No notes yet' : `No notes for ${periodLabels[tab] ?? tab}`}</h2>
        <p>Your scribbles will appear here when you add one.</p>
      </>
    );

  return (
    <AnimatePresence mode='wait'>
      {notes.length === 0 ? (
        <motion.div
          key={view === 'trash' ? 'empty-trash' : hasSearch ? 'empty-search' : `empty-${tab}`}
          className={styles.emptyState}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {emptyState}
        </motion.div>
      ) : (
        <motion.div
          key={view}
          className={styles.wrapper}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.grid}>
            <AnimatePresence mode='popLayout'>
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  className={styles.item}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
                >
                  <NoteCard
                    note={note}
                    view={view}
                    onOpen={() => onOpenNote(note)}
                    onToggleDelete={() => deleteNote(note.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
