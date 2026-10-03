import { PlusCircle, LayoutGrid, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Sidebar.module.css';

interface SidebarProps {
  view: 'notes' | 'trash';
  onViewChange: (view: 'notes' | 'trash') => void;
  onAddNote: () => void;
  onOpenSettings: () => void;
  userLabel: string;
  notesCount: number;
  trashCount: number;
}

export function Sidebar({
  view,
  onViewChange,
  onAddNote,
  onOpenSettings,
  userLabel,
  notesCount,
  trashCount,
}: SidebarProps) {
  const initial = userLabel.charAt(0).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <h1 className={styles.brand}>Scribbly</h1>

      <motion.button className={styles.addIcon} onClick={onAddNote} whileTap={{ scale: 0.96 }}>
        <PlusCircle size={20} />
        <span>New scribble</span>
      </motion.button>

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
          <Trash2 size={18} />
          <span>Trash</span>
          {trashCount > 0 && <span className={styles.badge}>{trashCount}</span>}
          {view === 'trash' && <motion.span layoutId='nav-active-bar' className={styles.activeBar} />}
        </button>
      </nav>

      <div className={styles.spacer} />

      <button className={styles.profile} onClick={onOpenSettings}>
        <div className={styles.avatar}>{initial}</div>
        <span className={styles.profileText}>
          <span className={styles.name}>{userLabel}</span>
          <span className={styles.description}>Profile & settings</span>
        </span>
      </button>
    </aside>
  );
}
