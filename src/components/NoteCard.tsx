import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MoreHorizontal,
  Undo2,
  Trash2,
  CloudSync,
  CloudAlert,
  Clock,
} from 'lucide-react';
import type { Note } from '../types/note';
import styles from './NoteCard.module.css';

interface NoteCardProps {
  note: Note;
  view: 'notes' | 'trash';
  onOpen: (id: string) => void;
  onToggleDelete: (id: string) => void;
}

export function NoteCard({
  note,
  view,
  onOpen,
  onToggleDelete,
}: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isTrash = view === 'trash';

  return (
    <div
      className={styles.card}
      style={{ backgroundColor: note.color }}
      onClick={() => onOpen(note.id)}
    >
      <div className={styles.topRow}>
        <span className={styles.date}>{note.date}</span>

        <div
          className={styles.menuWrapper}
          tabIndex={0}
          onBlur={() => setMenuOpen(false)}
        >
          <button
            type='button'
            className={styles.kebabButton}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreHorizontal size={16} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className={styles.menu}
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <button
                  type='button'
                  className={styles.menuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onToggleDelete(note.id);
                  }}
                >
                  {isTrash ? <Undo2 size={14} /> : <Trash2 size={14} />}
                  <span>{isTrash ? 'Restore' : 'Delete'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {note.title && (
        <p className={styles.title} title={note.title}>
          {note.title}
        </p>
      )}

      <div className={styles.divider} />

      <p className={styles.body}>{note.body}</p>

      <div className={styles.footer}>
        {note.pendingSync && (
          <span
            title='Waiting to sync to your account'
            className={styles.syncIcon}
          >
            <CloudSync size={14} aria-hidden='true' />
          </span>
        )}
        {!note.pendingSync && note.syncError && (
          <span
            title="Couldn't sync to your account yet. We'll keep retrying."
            className={styles.syncIcon}
          >
            <CloudAlert size={14} aria-hidden='true' />
          </span>
        )}
        <Clock size={14} />
        <span>{note.time}</span>
      </div>
    </div>
  );
}
