import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MoreHorizontal, Undo2, Trash } from 'lucide-react';
import type { Note } from '../types/note';
import { noteColorVar } from '../lib/noteColors';
import styles from './NoteCard.module.css';

interface NoteCardProps {
  note: Note;
  view: 'notes' | 'trash';
  onOpen: () => void;
  onToggleDelete: (id: string) => void;
}

function shapeFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 6;
}

function formatStamp(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sameYear = d.getFullYear() === now.getFullYear();
  const sameMonth = sameYear && d.getMonth() === now.getMonth();

  let day = `${weekday} ${d.getDate()}`;
  if (!sameMonth) day += ` ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  if (!sameYear) day += ` ${d.getFullYear()}`;

  return `${day} · ${time}`;
}

export function NoteCard({ note, view, onOpen, onToggleDelete }: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isTrash = view === 'trash';

  return (
    <div
      className={styles.card}
      data-shape={shapeFor(note.id)}
      style={{ backgroundColor: noteColorVar(note.color) }}
      onClick={() => {
        if (!isTrash && !note.deleted) {
          onOpen();
        }
      }}
    >
      <div className={styles.topRow}>
        <span className={styles.date}>{formatStamp(note.timestamp)}</span>

        <div className={styles.menuWrapper} tabIndex={0} onBlur={() => setMenuOpen(false)}>
          <button
            type='button'
            className={styles.kebabButton}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreHorizontal size={21} />
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
                  {isTrash ? <Undo2 size={14} /> : <Trash size={14} />}
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

      <p className={styles.body}>{note.body}</p>
    </div>
  );
}
