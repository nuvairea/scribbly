import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Trash, Mail, LogOut, UserX } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../hooks/useToast';
import styles from './SettingsView.module.css';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'scribbly_theme';
const APP_VERSION = 'Scribbly v3.3.0';

function applyTheme(theme: Theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

interface SettingsViewProps {
  isGuest: boolean;
  userEmail?: string;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onLoginPrompt: () => void;
}

export function SettingsView({ isGuest, userEmail, onLogout, onDeleteAccount, onLoginPrompt }: SettingsViewProps) {
  const { notes, emptyTrash } = useNotes();
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.trim() === 'DELETE';
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });

  useEffect(() => {
    applyTheme(theme);
    if (theme === 'system') {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  const cancelDelete = () => {
    setConfirmingDelete(false);
    setConfirmText('');
  };

  const handleConfirmDelete = () => {
    if (!canDelete) return;
    onDeleteAccount();
  };

  const handleExport = () => {
    if (notes.length === 0) {
      showToast('No notes to export');
      return;
    }
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scribbly-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Notes exported');
  };

  const handleClearTrash = () => {
    if (!notes.some((note) => note.deleted)) {
      showToast('Trash is already empty');
      return;
    }
    emptyTrash();
    showToast('Trash emptied');
  };

  return (
    <section className={styles.view} aria-label='Settings'>
      <p className={styles.sectionLabel}>Appearance</p>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Theme</span>
        <div className={styles.themeToggle}>
          {(['system', 'light', 'dark'] as Theme[]).map((option) => (
            <button key={option} type='button' className={`${styles.themeOption} ${theme === option ? styles.themeOptionActive : ''}`} onClick={() => setTheme(option)}>
              {theme === option && <motion.span layoutId='theme-pill' className={styles.themePill} transition={{ type: 'spring', duration: 0.22, bounce: 0 }} />}
              <span className={styles.themeLabel}>{option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}</span>
            </button>
          ))}
        </div>
      </div>

      <p className={styles.sectionLabel}>Data</p>
      <div className={styles.row}>
        <div>
          <p className={styles.rowLabel}>Export notes</p>
          <p className={styles.rowHint}>Download all your notes as a JSON file</p>
        </div>
        <button type='button' className={styles.actionButton} onClick={handleExport}>
          <Download size={14} />
          Export
        </button>
      </div>
      <div className={styles.row}>
        <div>
          <p className={styles.rowLabel}>Clear trash</p>
          <p className={styles.rowHint}>Permanently delete everything in trash</p>
        </div>
        <button type='button' className={styles.actionButton} onClick={handleClearTrash}>
          <Trash size={14} />
          Clear
        </button>
      </div>

      <p className={styles.sectionLabel}>Account</p>
      {isGuest ? (
        <div className={styles.guestPrompt}>
          <div className={styles.guestPromptText}>
            <p className={styles.rowLabel}>You're using Scribbly as a guest</p>
            <p className={styles.rowHint}>Sign-in with Google to sync notes and manage your account</p>
          </div>
          <button type='button' className={styles.actionButton} onClick={onLoginPrompt}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          {userEmail && (
            <div className={styles.emailRow}>
              <Mail size={14} />
              <span>Signed in as {userEmail}</span>
            </div>
          )}
          {confirmingDelete ? (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                This permanently deletes your account and all synced notes. Type <strong>DELETE</strong> to confirm.
              </p>
              <input className={styles.confirmInput} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder='DELETE' aria-label='Type DELETE to confirm' autoFocus autoCapitalize='characters' autoComplete='off' autoCorrect='off' spellCheck={false} />
              <div className={styles.confirmActions}>
                <button type='button' className={styles.actionButton} onClick={cancelDelete}>
                  Cancel
                </button>
                <button type='button' className={`${styles.actionButton} ${styles.dangerButton}`} disabled={!canDelete} onClick={handleConfirmDelete}>
                  <UserX size={14} />
                  Delete forever
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.accountActions}>
              <button type='button' className={styles.actionButton} onClick={onLogout}>
                <LogOut size={14} />
                Log out
              </button>
              <button type='button' className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => setConfirmingDelete(true)}>
                <UserX size={14} />
                Delete account
              </button>
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        <p className={styles.legal}>
          <a href='/terms.html' target='_blank' rel='noopener noreferrer'>
            Terms
          </a>
          <span aria-hidden='true'>·</span>
          <a href='/privacy.html' target='_blank' rel='noopener noreferrer'>
            Privacy Policy
          </a>
        </p>
        <p className={styles.version}>{APP_VERSION}</p>
      </div>
    </section>
  );
}
