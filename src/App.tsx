import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader, type SyncStatus } from './components/TopHeader';
import { Tabs } from './components/Tabs';
import { NotesGrid } from './components/NotesGrid';
import { AuthModal } from './components/AuthModal';
import { SplashScreen } from './components/SplashScreen';
import styles from './App.module.css';
import { useNotes } from './hooks/useNotes';
import { getMonthBounds, type MonthPosition } from './lib/NoteQueries';
import { checkSession, deleteAccount, loginWithGoogle, logout, type User } from './lib/auth';
import { NoteEditorModal } from './components/NoteEditorModal';
import { SettingsModal } from './components/SettingsModal';
import type { Note } from './types/note';

type AuthState = 'loading' | 'auth' | 'notes';

const USER_KEY = 'scribbly:user';
const GUEST_KEY = 'scribbly:guest';
const SPLASH_MAX_MS = 2000;

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const { setAuthContext } = useNotes();

  useEffect(() => {
    if (authState === 'loading') return;

    if (user) {
      void setAuthContext(true, user.userId);
    } else {
      void setAuthContext(false, null);
    }
  }, [user, authState, setAuthContext]);

  useEffect(() => {
    const cached = readCachedUser();
    const isGuest = localStorage.getItem(GUEST_KEY) === '1';

    const applyAuthFallback = () => {
      if (cached) {
        setUser(cached);
        setAuthState('notes');
      } else if (isGuest) {
        setAuthState('notes');
      } else {
        setAuthState('auth');
      }
    };

    const timer = setTimeout(applyAuthFallback, SPLASH_MAX_MS);
    checkSession()
      .then((result) => {
        clearTimeout(timer);
        if (result.ok) {
          localStorage.setItem(USER_KEY, JSON.stringify(result.data));
          localStorage.removeItem(GUEST_KEY);
          setUser(result.data);
          setAuthState('notes');
        } else if (result.status === 401) {
          localStorage.removeItem(USER_KEY);
          setAuthState(isGuest ? 'notes' : 'auth');
        } else {
          applyAuthFallback();
        }
      })
      .catch(() => {
        clearTimeout(timer);
        applyAuthFallback();
      });

    return () => clearTimeout(timer);
  }, []);

  const handleGoogle = async (code: string) => {
    try {
      const result = await loginWithGoogle(code);
      if (result.ok) {
        localStorage.setItem(USER_KEY, JSON.stringify(result.data));
        localStorage.removeItem(GUEST_KEY);
        setUser(result.data);
        setAuthState('notes');
      }
    } catch {
      setAuthState('auth');
    }
  };

  const handleGuest = () => {
    localStorage.setItem(GUEST_KEY, '1');
    setUser(null);
    setAuthState('notes');
  };

  if (authState === 'loading') return <SplashScreen />;

  if (authState === 'auth') {
    return <AuthModal onGoogle={handleGoogle} onGuest={handleGuest} />;
  }

  const handleLogout = async () => {
    const result = await logout();
    if (!result.ok) {
      console.error('Logout failed:', result.data.error);
      return;
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    setAuthState('auth');
  };

  const handleDeleteAccount = async () => {
    const result = await deleteAccount();
    if (!result.ok) {
      console.error('Account deletion failed:', result.data.error);
      return;
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    setAuthState('auth');
  };

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onDeleteAccount={handleDeleteAccount}
      onLoginPrompt={() => setAuthState('auth')}
    />
  );
}

function Dashboard({
  user,
  onLogout,
  onDeleteAccount,
  onLoginPrompt,
}: {
  user: User | null;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onLoginPrompt: () => void;
}) {
  const { notes } = useNotes();
  const [view, setView] = useState<'notes' | 'trash'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const updateContentFades = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.dataset.fadeStart = String(el.scrollTop > 1);
    el.dataset.fadeEnd = String(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    updateContentFades();
    const resizeObserver = new ResizeObserver(() => {
      updateContentFades();
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
    });
    resizeObserver.observe(el);
    Array.from(el.children).forEach((child) => resizeObserver.observe(child));

    const mutationObserver = new MutationObserver(() => {
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
      updateContentFades();
    });
    mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateContentFades]);

  const [selectedMonth, setSelectedMonth] = useState<MonthPosition>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const monthBounds = getMonthBounds(notes) ?? {
    earliest: selectedMonth,
    latest: selectedMonth,
  };

  const notesCount = notes.filter((n) => !n.deleted).length;
  const trashCount = notes.filter((n) => n.deleted).length;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const unsyncedCount = notes.filter((n) => n.pendingSync || n.syncError).length;
  const failedCount = notes.filter((n) => n.syncError).length;

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [slowSync, setSlowSync] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const hasPending = user !== null && unsyncedCount > 0;

  useEffect(() => {
    if (!hasPending) return;
    const timer = setTimeout(() => setSlowSync(true), 3000);
    return () => {
      clearTimeout(timer);
      setSlowSync(false);
    };
  }, [hasPending]);

  const showSyncBadge = user !== null
    && (failedCount > 0 || (unsyncedCount > 0 && (!isOnline || slowSync)));
  const badgeCount = showSyncBadge ? unsyncedCount : 0;
  const syncStatus: SyncStatus = failedCount > 0 ? 'failed' : !isOnline ? 'offline' : 'syncing';

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const openNewNote = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const openExistingNote = (note: Note) => {
    if (note.deleted) {
      return;
    }

    setEditingNote(note);
    setEditorOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.appFrame}>
        <Sidebar
          open={sidebarOpen}
          view={view}
          onViewChange={(nextView) => {
            setView(nextView);
            setSidebarOpen(false);
          }}
          onAddNote={() => {
            openNewNote();
            setSidebarOpen(false);
          }}
          onOpenSettings={() => {
            setSettingsOpen(true);
            setSidebarOpen(false);
          }}
          userLabel={user?.firstName ?? 'Guest'}
          userPicture={user?.picture}
          notesCount={notesCount}
          trashCount={trashCount}
        />
        <main className={styles.main}>
          <TopHeader
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            unsyncedCount={badgeCount}
            syncStatus={syncStatus}
            menuOpen={sidebarOpen}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div ref={contentRef} className={styles.content} onScroll={updateContentFades}>
            {view === 'notes' && (
              <Tabs
                tab={selectedTab}
                onTabChange={setSelectedTab}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                monthBounds={monthBounds}
              />
            )}

            <NotesGrid
              view={view}
              search={searchQuery}
              tab={selectedTab}
              month={selectedMonth}
              onOpenNote={openExistingNote}
              onViewChange={setView}
            />
          </div>
          <NoteEditorModal open={editorOpen} note={editingNote} onClose={() => setEditorOpen(false)} />
        </main>
      </div>
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayActive : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden='true'
      />
      <button type='button' className={styles.fab} aria-label='New scribble' onClick={openNewNote}>
        <Plus size={24} />
      </button>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isGuest={!user}
        userEmail={user?.email}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
        onLoginPrompt={onLoginPrompt}
      />
    </div>
  );
}

export default App;
