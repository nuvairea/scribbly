import { useState } from 'react';
import { PlusCircle, LayoutGrid, Trash } from 'lucide-react';
import { motion } from 'motion/react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  view: 'notes' | 'trash';
  onViewChange: (view: 'notes' | 'trash') => void;
  onAddNote: () => void;
  onOpenSettings: () => void;
  userLabel: string;
  userPicture?: string;
  notesCount: number;
  trashCount: number;
}

export function Sidebar({
  view,
  onViewChange,
  onAddNote,
  onOpenSettings,
  userLabel,
  userPicture,
  notesCount,
  trashCount,
}: SidebarProps) {
  const initial = userLabel.charAt(0).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <h1 className={styles.brand}>Scribbly</h1>

      <button className={styles.addIcon} onClick={onAddNote}>
        <PlusCircle size={20} />
        <span>New scribble</span>
      </button>

      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${view === 'notes' ? styles.navItemActive : ''}`}
          onClick={() => onViewChange('notes')}
        >
          <LayoutGrid size={18} />
          <span>All notes</span>
          {notesCount > 0 && <span className={styles.badge}>{notesCount}</span>}
          {view === 'notes' && <motion.span layoutId='nav-active-bar' className={styles.activeBar} />}
        </button>
        <button
          className={`${styles.navItem} ${view === 'trash' ? styles.navItemActive : ''}`}
          onClick={() => onViewChange('trash')}
        >
          <Trash size={18} />
          <span>Trash</span>
          {trashCount > 0 && <span className={styles.badge}>{trashCount}</span>}
          {view === 'trash' && <motion.span layoutId='nav-active-bar' className={styles.activeBar} />}
        </button>
      </nav>

      <div className={styles.spacer} />

      <button className={styles.profile} onClick={onOpenSettings}>
        {userPicture && !imgFailed ? (
          <img
            src={userPicture}
            alt=''
            className={styles.avatarImg}
            referrerPolicy='no-referrer'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={styles.avatar}>{initial}</div>
        )}
        <span className={styles.profileText}>
          <span className={styles.name}>{userLabel}</span>
          <span className={styles.description}>Profile & settings</span>
        </span>
      </button>
    </aside>
  );
}
