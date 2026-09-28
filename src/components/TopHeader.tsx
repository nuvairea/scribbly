import { Search } from 'lucide-react';
import styles from './TopHeader.module.css';

interface TopHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TopHeader({
  title,
  searchValue,
  onSearchChange,
}: TopHeaderProps) {
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
    </header>
  );
}
