import { Inbox, Plus, Settings, Trash2, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { View } from '../types/view';
import styles from './Dock.module.css';

interface DockProps {
  view: View;
  onViewChange: (view: View) => void;
  onAddNote: () => void;
  trashCount: number;
}

interface DockItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const PILL_TRANSITION = { type: 'spring', duration: 0.22, bounce: 0 } as const;

function DockItem({ icon: Icon, label, active = false, onClick }: DockItemProps) {
  return (
    <button
      type='button'
      className={styles.item}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {active && <motion.span layoutId='dock-active' className={styles.activePill} transition={PILL_TRANSITION} />}
      <Icon size={18} className={styles.icon} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

export function Dock({ view, onViewChange, onAddNote, trashCount }: DockProps) {
  return (
    <nav className={styles.dock} aria-label='Main'>
      <DockItem icon={Inbox} label='Notes' active={view === 'notes'} onClick={() => onViewChange('notes')} />
      <DockItem
        icon={Trash2}
        label={trashCount > 0 ? `Trash · ${trashCount}` : 'Trash'}
        active={view === 'trash'}
        onClick={() => onViewChange('trash')}
      />
      <DockItem
        icon={Settings}
        label='Settings'
        active={view === 'settings'}
        onClick={() => onViewChange('settings')}
      />
      <button type='button' className={styles.add} aria-label='New scribble' onClick={onAddNote}>
        <Plus size={22} />
      </button>
    </nav>
  );
}
