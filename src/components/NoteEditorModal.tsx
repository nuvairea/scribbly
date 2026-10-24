import { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useScrollFade } from '../hooks/useScrollFade';
import { NOTE_COLORS, noteColorVar, toNoteColor } from '../lib/noteColors';
import type { Note } from '../types/note';
import styles from './NoteEditorModal.module.css';

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
  const [color, setColor] = useState(toNoteColor(note?.color));
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const titleRef = useScrollFade<HTMLInputElement>('x');
  const bodyRef = useScrollFade<HTMLTextAreaElement>('y');

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [body, bodyRef]);

  const handleDone = () => {
    const isEmpty = title.trim() === '' && body.trim() === '';
    if (isEmpty) {
      onClose();
      return;
    }

    if (note) {
      const hasChanges = title !== note.title || body !== note.body || color !== toNoteColor(note.color);
      if (hasChanges) {
        updateNote(note.id, title, body, color);
      }
    } else {
      addNote(title, body, color);
    }

    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      handleDone();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', duration: 0.28, bounce: 0 } }}
        exit={{ y: '100%', transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <input
            ref={titleRef}
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
          ref={bodyRef}
          autoFocus
          className={styles.body}
          placeholder={placeholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className={styles.colors}>
          {NOTE_COLORS.map((name) => (
            <button
              key={name}
              type='button'
              className={styles.swatch}
              style={{ backgroundColor: noteColorVar(name) }}
              data-active={color === name}
              onClick={() => setColor(name)}
              aria-label={name}
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
