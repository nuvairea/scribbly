import { useCallback, useEffect, useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.dataset.fadeStart = String(el.scrollLeft > 1);
    el.dataset.fadeEnd = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateFades);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateFades]);

  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [tab]);

  return (
    <div className={styles.tabsRow}>
      <motion.div
        layoutScroll
        ref={scrollRef}
        className={styles.tabs}
        onScroll={updateFades}
      >
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
              <motion.span
                layoutId='tab-underline'
                className={styles.underline}
              />
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
