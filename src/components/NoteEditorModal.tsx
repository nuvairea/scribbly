import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import type { Note } from '../types/note';
import styles from './NoteEditorModal.module.css';

const COLORS = [
  { name: 'yellow', value: '#e9e381' },
  { name: 'blue', value: '#6cb5de' },
  { name: 'coral', value: '#eea9ab' },
  { name: 'mint', value: '#5cffd9' },
  { name: 'lavender', value: '#c9a9e0' },
];

const PLACEHOLDERS = [
  'Start scribbling...',
  "Today's multi-dollar idea?",
  "Nothing's too dumb to write down.",
  'Future you says thanks.',
  'Brain dump goes here...',
  'Draft one of many...',
];

interface NoteEditorModalProps {
  open: boolean;
  note: Note | null;
  onClose: () => void;
}

export function NoteEditorModal({ open, note, onClose }: NoteEditorModalProps) {
  return (
    <AnimatePresence>{open && <NoteEditor key={note?.id ?? 'new'} note={note} onClose={onClose} />}</AnimatePresence>
  );
}

function NoteEditor({ note, onClose }: Omit<NoteEditorModalProps, 'open'>) {
  const { addNote, updateNote } = useNotes();
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [color, setColor] = useState(note?.color ?? COLORS[0].value);
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  const handleDone = () => {
    if (note) {
      updateNote(note.id, title, body, color);
    } else {
      addNote(title, body, color);
    }

    onClose();
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, translateY: 35 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: 100 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <input
            className={styles.titleInput}
            placeholder='Give it a title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <button type='button' className={styles.closeButton} onClick={onClose} aria-label='Close'>
            <X size={20} />
          </button>
        </div>

        <textarea
          autoFocus
          className={styles.body}
          placeholder={placeholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className={styles.colors}>
          {COLORS.map((c) => (
            <button
              key={c.name}
              type='button'
              className={styles.swatch}
              style={{ backgroundColor: c.value }}
              data-active={color === c.value}
              onClick={() => setColor(c.value)}
              aria-label={c.name}
            />
          ))}
        </div>

        <button type='button' className={styles.doneBtn} onClick={handleDone}>
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}
