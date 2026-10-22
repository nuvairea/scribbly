export const NOTE_COLORS = ['sun', 'sky', 'clay', 'mint', 'blush'] as const;

export type NoteColorName = (typeof NOTE_COLORS)[number];

const LEGACY_HEX: Record<string, NoteColorName> = {
  '#e9e381': 'sun',
  '#6cb5de': 'sky',
  '#eea9ab': 'clay',
  '#5cffd9': 'mint',
  '#c9a9e0': 'blush',
};

export function toNoteColor(value: string | null | undefined): NoteColorName {
  if (!value) return NOTE_COLORS[0];
  if ((NOTE_COLORS as readonly string[]).includes(value)) return value as NoteColorName;
  return LEGACY_HEX[value.toLowerCase()] ?? NOTE_COLORS[0];
}

export function noteColorVar(value: string | null | undefined): string {
  return `var(--color-note-${toNoteColor(value)})`;
}
