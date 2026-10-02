import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthPosition } from '../lib/NoteQueries';
import styles from './DateNav.module.css';

interface DateNavProps {
  month: MonthPosition;
  onChange: (month: MonthPosition) => void;
  bounds: { earliest: MonthPosition; latest: MonthPosition } | null;
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function monthKey(m: MonthPosition) {
  return m.year * 12 + m.month;
}

export function DateNav({ month, onChange, bounds }: DateNavProps) {
  const label = monthFormatter.format(new Date(month.year, month.month));

  const goTo = (delta: number) => {
    const next = new Date(month.year, month.month + delta);
    onChange({ month: next.getMonth(), year: next.getFullYear() });
  };

  if (!bounds)
    return (
      <div className={styles.dateNav}>
        <span className={styles.label}>{label}</span>
      </div>
    );

  const currentKey = monthKey(month);
  const showPrev = currentKey > monthKey(bounds.earliest);
  const showNext = currentKey < monthKey(bounds.latest);

  return (
    <div className={styles.dateNav}>
      {showPrev && (
        <button type='button' className={styles.arrow} onClick={() => goTo(-1)} aria-label='Previous month'>
          <ChevronLeft size={16} />
        </button>
      )}

      <span className={styles.label}>{label}</span>

      {showNext && (
        <button type='button' className={styles.arrow} onClick={() => goTo(1)} aria-label='Next month'>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
