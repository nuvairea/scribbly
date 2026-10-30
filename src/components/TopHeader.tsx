import { useState, useRef, useEffect } from 'react';
import { CloudAlert, CloudCheck, CloudOff, CloudSync, Search, type LucideIcon } from 'lucide-react';
import type { View } from '../types/view';
import styles from './TopHeader.module.css';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'failed';

interface TopHeaderProps {
  view: View;
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

function getHeadline(view: View, notesCount: number, todayCount: number, trashCount: number) {
  if (view === 'settings') return { main: 'Settings', rest: '' };

  if (view === 'trash') {
    return trashCount === 0
      ? { main: '0 in trash.', rest: '' }
      : { main: `${trashCount} in trash`, rest: ', gone after 7 days.' };
  }

  if (notesCount === 0) return { main: '0 notes.', rest: '' };

  return {
    main: `${notesCount} ${notesCount === 1 ? 'note' : 'notes'}`,
    rest: todayCount > 0 ? `, ${todayCount} today.` : ', none today.',
  };
}

function getShortcutHint(): string | null {
  const hasKeyboard = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasKeyboard) return null;

  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform;
  return /mac/i.test(platform) ? '⌘K' : 'Ctrl K';
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
  const showSearch = view !== 'settings';
  const syncBadge = syncStatus !== null && SyncIcon !== null;

  const searchRef = useRef<HTMLInputElement>(null);
  const [shortcutHint] = useState(getShortcutHint);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

      {(syncBadge || showSearch) && (
        <div className={styles.tools}>
          {syncStatus && SyncIcon && (
            <div role='status' className={`${styles.syncBadge} ${SYNC_CLASSES[syncStatus] ?? ''}`}>
              <SyncIcon size={16} />
              <span>{SYNC_LABELS[syncStatus](unsyncedCount)}</span>
            </div>
          )}
          {showSearch && (
            <label className={styles.search}>
              <Search size={18} aria-hidden='true' />
              <input
                ref={searchRef}
                type='search'
                aria-label='Search notes'
                placeholder='Search'
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              {shortcutHint && !searchValue && <kbd className={styles.shortcut}>{shortcutHint}</kbd>}
            </label>
          )}
        </div>
      )}

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
