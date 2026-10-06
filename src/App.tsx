import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Tabs } from './components/Tabs';
import { NotesGrid } from './components/NotesGrid';
import { AuthModal } from './components/AuthModal';
import { SplashScreen } from './components/SplashScreen';
import styles from './App.module.css';
import { useNotes } from './hooks/useNotes';
import { getMonthBounds, type MonthPosition } from './lib/NoteQueries';
import { checkSession, loginWithGoogle, type User } from './lib/auth';
import { NoteEditorModal } from './components/NoteEditorModal';
import type { Note } from './types/note';

type AuthState = 'loading' | 'auth' | 'notes';

const USER_KEY = 'scribbly:user';
const GUEST_KEY = 'scribbly:guest';

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

    checkSession()
      .then((result) => {
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
      .catch(applyAuthFallback);
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

  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: User | null }) {
  const { notes } = useNotes();
  const [view, setView] = useState<'notes' | 'trash'>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

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
          view={view}
          onViewChange={setView}
          onAddNote={openNewNote}
          onOpenSettings={() => console.log('settings clicked')}
          userLabel={user?.firstName ?? 'Guest'}
          userPicture={user?.picture}
          notesCount={notesCount}
          trashCount={trashCount}
        />
        <main className={styles.main}>
          <TopHeader
            title={view === 'notes' ? 'Notes' : 'Trash'}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <div className={styles.content}>
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

            <NoteEditorModal open={editorOpen} note={editingNote} onClose={() => setEditorOpen(false)} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
