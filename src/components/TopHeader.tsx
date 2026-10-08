import { CloudAlert, Search } from 'lucide-react';
import styles from './TopHeader.module.css';

interface TopHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  unsyncedCount: number;
}

export function TopHeader({ title, searchValue, onSearchChange, unsyncedCount }: TopHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <label className={styles.search}>
        <Search size={20} aria-hidden='true' />
        <input
          type='search'
          aria-label='Search notes'
          placeholder='Search'
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      {unsyncedCount > 0 && (
        <div className={styles.syncBadge}>
          <CloudAlert size={16} />
          <span>{unsyncedCount} unsynced</span>
        </div>
      )}
    </header>
  );
}
