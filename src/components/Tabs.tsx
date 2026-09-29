import { motion } from 'framer-motion';
import styles from './Tabs.module.css';

interface TabsProps {
  tab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

const monthLabel = new Date().toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
});

export function Tabs({ tab, onTabChange }: TabsProps) {
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
        <span className={styles.monthLabel}>{monthLabel}</span>
      )}
    </div>
  );
}
