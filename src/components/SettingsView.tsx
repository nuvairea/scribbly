import { useEffect, useState } from 'react';
import { Download, Trash, Mail, LogOut, LogIn, UserX, Moon, Tag, RefreshCw, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useToast } from '../hooks/useToast';
import { checkForUpdate } from '../lib/appUpdate';
import styles from './SettingsView.module.css';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'scribbly_theme';
const RELEASE_URL = `https://github.com/nuvairea/scribbly/releases/tag/v${__APP_VERSION__}`;

type UpdateStatus = 'idle' | 'checking' | 'latest' | 'available' | 'error';

const UPDATE_HINTS: Record<UpdateStatus, string> = {
  idle: 'See if a newer version is out',
  checking: 'Checking...',
  latest: "You're on the latest version",
  available: 'New version available',
  error: "Couldn't check, try again",
};
const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function applyTheme(theme: Theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function MiniScreen({ tone, clipped = false }: { tone: 'light' | 'dark'; clipped?: boolean }) {
  return (
    <span className={`${styles.mini} ${clipped ? styles.miniClipped : ''}`} data-tone={tone} aria-hidden='true'>
      <span className={styles.miniCard}>
        <span className={styles.miniLine} />
        <span className={`${styles.miniLine} ${styles.miniLineShort}`} />
        <span className={styles.miniDot} />
      </span>
    </span>
  );
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
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const canDelete = confirmText.trim() === 'DELETE';
  const trashedCount = notes.filter((note) => note.deleted).length;
  const trashedLabel = `${trashedCount} ${trashedCount === 1 ? 'note' : 'notes'}`;
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
    if (trashedCount === 0) {
      showToast('Trash is already empty');
      return;
    }
    setConfirmingTrash(true);
  };

  const handleCheckUpdate = async () => {
    if (updateStatus === 'checking') return;
    setUpdateStatus('checking');
    setUpdateStatus(await checkForUpdate());
  };

  const handleConfirmClearTrash = () => {
    emptyTrash();
    setConfirmingTrash(false);
    showToast('Trash emptied');
  };

  return (
    <section className={styles.view} aria-label='Settings'>
      <div className={styles.group}>
        <div className={styles.themeHead}>
          <Moon size={18} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Theme</span>
        </div>
        <div className={styles.tiles}>
          {THEME_OPTIONS.map(({ value, label }) => (
            <button key={value} type='button' className={`${styles.tile} ${theme === value ? styles.tileActive : ''}`} aria-pressed={theme === value} onClick={() => setTheme(value)}>
              <span className={styles.preview}>
                {value === 'system' ? (
                  <>
                    <MiniScreen tone='dark' />
                    <MiniScreen tone='light' clipped />
                  </>
                ) : (
                  <MiniScreen tone={value} />
                )}
              </span>
              <span className={styles.tileLabel}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <button type='button' className={styles.row} onClick={handleExport}>
          <Download size={18} className={styles.rowIcon} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Export notes</span>
            <span className={styles.rowHint}>Download all your notes as a JSON file</span>
          </span>
        </button>
        <button type='button' className={`${styles.row} ${trashedCount === 0 ? styles.rowMuted : ''}`} onClick={handleClearTrash}>
          <Trash size={18} className={styles.rowIcon} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Clear trash</span>
            <span className={styles.rowHint}>{trashedCount === 0 ? 'Trash is empty' : `Permanently delete ${trashedLabel} in trash`}</span>
          </span>
        </button>
        {confirmingTrash && trashedCount > 0 && (
          <div className={styles.trashConfirm}>
            <p className={styles.confirmText}>Delete {trashedLabel} forever? This can't be undone.</p>
            <div className={styles.confirmActions}>
              <button type='button' className={styles.actionButton} onClick={() => setConfirmingTrash(false)}>
                Cancel
              </button>
              <button type='button' className={`${styles.actionButton} ${styles.dangerButton}`} onClick={handleConfirmClearTrash}>
                {trashedCount === 1 ? 'Delete note' : 'Delete notes'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.group}>
        <a className={styles.row} href={RELEASE_URL} target='_blank' rel='noopener noreferrer'>
          <Tag size={18} className={styles.rowIcon} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Version</span>
            <span className={styles.rowHint}>v{__APP_VERSION__}</span>
          </span>
          <ExternalLink size={16} className={styles.trailingIcon} aria-hidden='true' />
        </a>
        <button type='button' className={styles.row} onClick={handleCheckUpdate} aria-busy={updateStatus === 'checking'}>
          <RefreshCw size={18} className={`${styles.rowIcon} ${updateStatus === 'checking' ? styles.spin : ''}`} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Check for updates</span>
            <span className={styles.rowHint} aria-live='polite'>
              {UPDATE_HINTS[updateStatus]}
            </span>
          </span>
        </button>
        <a className={styles.row} href='/terms.html' target='_blank' rel='noopener noreferrer'>
          <FileText size={18} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Terms</span>
          <ExternalLink size={16} className={styles.trailingIcon} aria-hidden='true' />
        </a>
        <a className={styles.row} href='/privacy.html' target='_blank' rel='noopener noreferrer'>
          <ShieldCheck size={18} className={styles.rowIcon} />
          <span className={styles.rowLabel}>Privacy policy</span>
          <ExternalLink size={16} className={styles.trailingIcon} aria-hidden='true' />
        </a>
      </div>

      {isGuest ? (
        <div className={styles.group}>
          <button type='button' className={styles.row} onClick={onLoginPrompt}>
            <LogIn size={18} className={styles.rowIcon} />
            <span className={styles.rowText}>
              <span className={styles.rowLabel}>Sign in</span>
              <span className={styles.rowHint}>You're using Scribbly as a guest. Sign in with Google to sync notes and manage your account</span>
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className={styles.group}>
            {userEmail && (
              <div className={styles.row}>
                <Mail size={18} className={styles.rowIcon} />
                <span className={styles.rowText}>
                  <span className={styles.rowHint}>Signed in as</span>
                  <span className={`${styles.rowLabel} ${styles.rowEmail}`}>{userEmail}</span>
                </span>
              </div>
            )}
            <button type='button' className={styles.row} onClick={onLogout}>
              <LogOut size={18} className={styles.rowIcon} />
              <span className={styles.rowLabel}>Log out</span>
            </button>
          </div>

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
            <button type='button' className={styles.deletePill} onClick={() => setConfirmingDelete(true)}>
              <UserX size={20} className={styles.rowIcon} />
              <span className={styles.rowText}>
                <span className={styles.deleteTitle}>Delete account</span>
                <span className={styles.deleteHint}>Removes your account and all notes</span>
              </span>
            </button>
          )}
        </>
      )}
    </section>
  );
}
