import { useState } from 'react';
import { CloudAlert, CloudCheck, CloudOff, CloudSync, Search, type LucideIcon } from 'lucide-react';
import styles from './TopHeader.module.css';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'failed';

interface TopHeaderProps {
  view: 'notes' | 'trash';
  userName?: string;
  userPicture?: string;
  notesCount: number;
  todayCount: number;
  trashCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  unsyncedCount: number;
  syncStatus: SyncStatus | null;
  onOpenSettings: () => void;
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getHeadline(view: 'notes' | 'trash', notesCount: number, todayCount: number, trashCount: number) {
  if (view === 'trash') {
    return trashCount === 0
      ? { main: 'Trash is empty.', rest: '' }
      : { main: `${trashCount} in trash`, rest: ', gone after 7 days.' };
  }

  if (notesCount === 0) return { main: 'No notes yet.', rest: '' };

  return {
    main: `${notesCount} ${notesCount === 1 ? 'note' : 'notes'}`,
    rest: todayCount > 0 ? `, ${todayCount} today.` : ', none today.',
  };
}

export function TopHeader({
  view,
  userName,
  userPicture,
  notesCount,
  todayCount,
  trashCount,
  searchValue,
  onSearchChange,
  unsyncedCount,
  syncStatus,
  onOpenSettings,
}: TopHeaderProps) {
  const SyncIcon = syncStatus ? SYNC_ICONS[syncStatus] : null;
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (userName ?? 'Guest').charAt(0).toUpperCase();
  const headline = getHeadline(view, notesCount, todayCount, trashCount);

  return (
    <header className={styles.header}>
      <p className={styles.brand}>Scribbly</p>

      <div className={styles.headline}>
        <p className={styles.greeting}>{userName ? `${getGreeting()}, ${userName}` : getGreeting()}</p>
        <h1 className={styles.title}>
          {headline.main}
          <span className={styles.muted}>{headline.rest}</span>
        </h1>
      </div>

      <div className={styles.tools}>
        {syncStatus && SyncIcon && (
          <div role='status' className={`${styles.syncBadge} ${SYNC_CLASSES[syncStatus] ?? ''}`}>
            <SyncIcon size={16} />
            <span>{SYNC_LABELS[syncStatus](unsyncedCount)}</span>
          </div>
        )}
        <label className={styles.search}>
          <Search size={18} aria-hidden='true' />
          <input
            type='search'
            aria-label='Search notes'
            placeholder='Search'
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      <button type='button' className={styles.avatar} aria-label='Profile and settings' onClick={onOpenSettings}>
        {userPicture && !imgFailed ? (
          <img src={userPicture} alt='' referrerPolicy='no-referrer' onError={() => setImgFailed(true)} />
        ) : (
          initial
        )}
      </button>
    </header>
  );
}
