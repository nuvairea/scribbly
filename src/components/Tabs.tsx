import { motion } from 'framer-motion';
import { DateNav } from './DateNav';
import type { MonthPosition } from '../lib/NoteQueries';
import styles from './Tabs.module.css';
interface TabsProps {
  tab: string;
  onTabChange: (tab: string) => void;
  month: MonthPosition;
  onMonthChange: (month: MonthPosition) => void;
  monthBounds: { earliest: MonthPosition; latest: MonthPosition } | null;
}

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export function Tabs({
  tab,
  onTabChange,
  month,
  onMonthChange,
  monthBounds,
}: TabsProps) {
  return (
    <div className={styles.tabsRow}>
      <div className={styles.tabs}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => onTabChange(id)}
          >
            {label}
            {tab === id && (
              <motion.span
                layoutId='tab-underline'
                className={styles.underline}
              />
            )}
          </button>
        ))}
      </div>
      {tab === 'month' && (
        <DateNav month={month} onChange={onMonthChange} bounds={monthBounds} />
      )}
    </div>
  );
}
