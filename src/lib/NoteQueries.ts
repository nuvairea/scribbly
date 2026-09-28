import type { Note } from '../types/note';

export function filterNotes(notes: Note[], isDeleted: boolean, search = '', tab = 'today'): Note[] {
  const now = new Date();
  const normalizedSearch = search.trim().toLowerCase();
  const hasSearch = search.trim().length > 0;

  return notes
    .filter((note) => {
      if (note.deleted !== isDeleted) return false;

      const matchesSearch = note.title.toLowerCase().includes(normalizedSearch) || note.body.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (isDeleted || hasSearch || tab === 'all') return true;

      const noteDate = new Date(note.timestamp);

      if (noteDate.getMonth() !== now.getMonth() || noteDate.getFullYear() !== now.getFullYear()) {
        return false;
      }

      if (tab === 'today') {
        return noteDate.toDateString() === now.toDateString();
      }

      if (tab === 'week') {
        const diffDays = Math.abs(now.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }

      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}