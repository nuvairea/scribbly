import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Download, Trash, Mail, LogOut, UserX } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import styles from './SettingsModal.module.css';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'scribbly_theme';
const APP_VERSION = 'Scribbly v3.0.0-beta';

function applyTheme(theme: Theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  isGuest: boolean;
  userEmail?: string;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onLoginPrompt: () => void;
}

export function SettingsModal({
  open,
  onClose,
  isGuest,
  userEmail,
  onLogout,
  onDeleteAccount,
  onLoginPrompt,
}: SettingsModalProps) {
  const { notes, emptyTrash } = useNotes();
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

  const handleClose = () => {
    cancelDelete();
    onClose();
  };

  const handleConfirmDelete = () => {
    if (!canDelete) return;
    onDeleteAccount();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scribbly-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearTrash = () => {
    emptyTrash();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={styles.modal}
            role='dialog'
            aria-modal='true'
            aria-label='Settings'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h1 className={styles.title}>Settings</h1>
              <button type='button' className={styles.closeButton} onClick={handleClose} aria-label='Close'>
                <X size={18} />
              </button>
            </div>

            <p className={styles.sectionLabel}>Appearance</p>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Theme</span>
              <div className={styles.themeToggle}>
                {(['system', 'light', 'dark'] as Theme[]).map((option) => (
                  <button
                    key={option}
                    type='button'
                    className={`${styles.themeOption} ${theme === option ? styles.themeOptionActive : ''}`}
                    onClick={() => setTheme(option)}
                  >
                    {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
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
                      This permanently deletes your account and all synced notes. Type <strong>DELETE</strong> to
                      confirm.
                    </p>
                    <input
                      className={styles.confirmInput}
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder='DELETE'
                      aria-label='Type DELETE to confirm'
                      autoFocus
                      autoCapitalize='characters'
                      autoComplete='off'
                      autoCorrect='off'
                      spellCheck={false}
                    />
                    <div className={styles.confirmActions}>
                      <button type='button' className={styles.actionButton} onClick={cancelDelete}>
                        Cancel
                      </button>
                      <button
                        type='button'
                        className={`${styles.actionButton} ${styles.dangerButton}`}
                        disabled={!canDelete}
                        onClick={handleConfirmDelete}
                      >
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
                    <button
                      type='button'
                      className={`${styles.actionButton} ${styles.dangerButton}`}
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <UserX size={14} />
                      Delete account
                    </button>
                  </div>
                )}
              </>
            )}

            <p className={styles.version}>{APP_VERSION}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
