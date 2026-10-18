import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateNav } from './DateNav';
import type { MonthPosition } from '../lib/NoteQueries';
import { useScrollFade } from '../hooks/useScrollFade';
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

const UNDERLINE_TRANSITION = { type: 'spring', duration: 0.22, bounce: 0 } as const;

export function Tabs({ tab, onTabChange, month, onMonthChange, monthBounds }: TabsProps) {
  const scrollRef = useScrollFade<HTMLDivElement>('x');

  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [tab, scrollRef]);

  return (
    <div className={styles.tabsRow}>
      <motion.div layoutScroll ref={scrollRef} className={styles.tabs}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            aria-current={tab === id ? 'true' : undefined}
            onClick={() => onTabChange(id)}
          >
            {label}
            {tab === id && (
              <motion.span layoutId='tab-underline' className={styles.underline} transition={UNDERLINE_TRANSITION} />
            )}
          </button>
        ))}
      </motion.div>
      {tab === 'month' && (
        <div className={styles.dateNav}>
          <DateNav month={month} onChange={onMonthChange} bounds={monthBounds} />
        </div>
      )}
    </div>
  );
}
