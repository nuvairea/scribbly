import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import type { MonthPosition } from '../lib/NoteQueries';
import styles from './NotesGrid.module.css';

interface NotesGridProps {
  search?: string;
  tab?: string;
  month?: MonthPosition;
  onAddNote?: () => void;
}

export function NotesGrid({ search = '', tab = 'all', month }: NotesGridProps) {
  const { getNotes } = useNotes();
  const notes = getNotes(false, search, tab, month ?? null);

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            view='notes'
            onOpen={(id) => console.log('open note', id)}
            onToggleDelete={(id) => console.log('toggle delete', id)}
          />
        ))}
      </div>
    </div>
  );
}