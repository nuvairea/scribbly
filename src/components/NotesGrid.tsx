import { useEffect, useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../hooks/useToast';
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

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

const GLIDE = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 } as const;

export function NotesGrid({ view, search = '', tab = 'all', month, onOpenNote, onViewChange }: NotesGridProps) {
  const { getNotes, deleteNote } = useNotes();
  const { showToast } = useToast();
  const notes = getNotes(view === 'trash', search, tab, month ?? null);
  const hasSearch = search.trim().length > 0;

  const [shownView, setShownView] = useState(view);
  const [cascade, setCascade] = useState(true);
  if (shownView !== view) {
    setShownView(view);
    setCascade(true);
  }
  useEffect(() => {
    const id = window.setTimeout(() => setCascade(false), 450);
    return () => window.clearTimeout(id);
  }, [view]);

  const ids = notes.map((n) => n.id);
  const idsKey = ids.join('|');
  const [prev, setPrev] = useState({ view, tab, idsKey, ids });
  const [tabEnter, setTabEnter] = useState<Map<string, number>>(new Map());

  if (prev.view !== view || prev.tab !== tab || prev.idsKey !== idsKey) {
    if (prev.view === view && prev.tab !== tab) {
      const before = new Set(prev.ids);
      const next = new Map<string, number>();
      let order = 0;
      for (const id of ids) if (!before.has(id)) next.set(id, order++);
      setTabEnter(next);
    }
    setPrev({ view, tab, idsKey, ids });
  }

  useEffect(() => {
    if (tabEnter.size === 0) return;
    const id = window.setTimeout(() => setTabEnter(new Map()), 800);
    return () => window.clearTimeout(id);
  }, [tabEnter]);

  const exitY = view === 'trash' ? -12 : 14;

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
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        <AnimatePresence mode='popLayout' initial={cascade}>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              className={styles.item}
              layout='position'
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.24,
                  ease: EASE_OUT,
                  delay: cascade ? Math.min(index, 6) * 0.03 : Math.min(tabEnter.get(note.id) ?? 0, 8) * 0.05,
                },
              }}
              exit={{
                opacity: 0,
                y: exitY,
                scale: 0.97,
                transition: { duration: 0.14, ease: EASE_IN },
              }}
              transition={{ layout: GLIDE }}
            >
              <NoteCard
                note={note}
                view={view}
                onOpen={() => onOpenNote(note)}
                onToggleDelete={() => {
                  void deleteNote(note.id);
                  showToast(view === 'trash' ? 'Note restored' : 'Note moved to trash');
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode='popLayout'>
        {notes.length === 0 && (
          <motion.div
            key={`empty-${view}`}
            className={styles.emptyState}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT, delay: 0.08 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {emptyState}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
