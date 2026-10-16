import { CloudAlert, CloudOff, CloudSync, CloudCheck, Menu, Search, type LucideIcon } from 'lucide-react';
import styles from './TopHeader.module.css';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'failed';

interface TopHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  unsyncedCount: number;
  syncStatus: SyncStatus | null;
  menuOpen: boolean;
  onMenuClick: () => void;
}

const SYNC_LABELS: Record<SyncStatus, (count: number) => string> = {
  synced: () => 'All synced',
  syncing: (count) => `Syncing ${count}...`,
  offline: (count) => `${count} unsynced`,
  failed: (count) => `${count} failed to sync`,
};

const SYNC_ICONS: Record<SyncStatus, LucideIcon> = {
  synced: CloudCheck,
  syncing: CloudSync,
  offline: CloudOff,
  failed: CloudAlert,
};

const SYNC_CLASSES: Partial<Record<SyncStatus, string>> = {
  synced: styles.synced,
  syncing: styles.syncing,
};

export function TopHeader({
  title,
  searchValue,
  onSearchChange,
  unsyncedCount,
  syncStatus,
  menuOpen,
  onMenuClick,
}: TopHeaderProps) {
  const SyncIcon = syncStatus ? SYNC_ICONS[syncStatus] : null;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type='button'
          className={styles.menuButton}
          aria-label='Open menu'
          aria-expanded={menuOpen}
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <h1 className={styles.brand}>Scribbly</h1>
        <h2 className={styles.title}>{title}</h2>
      </div>
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
      {syncStatus && SyncIcon && (
        <div role='status' className={`${styles.syncBadge} ${SYNC_CLASSES[syncStatus] ?? ''}`}>
          <SyncIcon size={16} />
          <span>{SYNC_LABELS[syncStatus](unsyncedCount)}</span>
        </div>
      )}
    </header>
  );
}
