import type { Note } from '../types/note';

export type MonthPosition = {
  month: number;
  year: number;
}

type MonthBounds = {
  earliest: MonthPosition;
  latest: MonthPosition;
}

export function filterNotes(notes: Note[], isDeleted: boolean, search = '', tab = 'today', viewedMonth: MonthPosition | null = null): Note[] {
  const now = new Date();
  const normalizedSearch = search.trim().toLowerCase();
  const hasSearch = search.trim().length > 0;

  return notes
    .filter((note) => {
      if (note.deleted !== isDeleted) return false;

      const matchesSearch = note.title.toLowerCase().includes(normalizedSearch) || note.body.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (isDeleted || hasSearch) return true;

      const noteDate = new Date(note.timestamp);
      const target = viewedMonth ?? {
        month: now.getMonth(),
        year: now.getFullYear()
      };

      if (noteDate.getMonth() !== target.month || noteDate.getFullYear() !== target.year) {
        return false;
      }

      if (tab === 'today') {
        return noteDate.toDateString() === now.toDateString();
      }

      if (tab === 'week') {
        const diffDays =
          Math.abs(now.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }

      if (tab === 'month') {
        return true;
      }

      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
}

export function getMonthBounds(notes: Note[]): MonthBounds | null {
  const active = notes.filter((note) => !note.deleted);
  if (active.length === 0) return null;

  const now = new Date();
  let earliest: MonthPosition | null = null;
  let latest: MonthPosition | null = null;

  for (const note of active) {
    const date = new Date(note.timestamp);
    const current = { month: date.getMonth(), year: date.getFullYear() };

    const key = current.year * 12 + current.month;
    const earliestKey = earliest ? earliest.year * 12 + earliest.month : Infinity;
    const latestKey = latest ? latest.year * 12 + latest.month : -Infinity;

    if (key < earliestKey) earliest = current;
    if (key > latestKey) latest = current;
  }

  const currentMonth = { month: now.getMonth(), year: now.getFullYear() };
  const currentKey = currentMonth.year * 12 + currentMonth.month;
  const latestKey = latest!.year * 12 + latest!.month;

  if (currentKey > latestKey) latest = currentMonth;

  return { earliest: earliest!, latest: latest! };
}