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
import { checkSession } from './lib/auth';
import { NoteEditorModal } from './components/NoteEditorModal';
import type { Note } from './types/note';

type AuthState = 'loading' | 'auth' | 'notes';

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    checkSession()
      .then(() => setAuthState('auth'))
      .catch(() => setAuthState('auth'));
  }, []);

  if (authState === 'loading') return <SplashScreen />;
  if (authState === 'auth') return <AuthModal onGoogle={() => {}} onGuest={() => setAuthState('notes')} />;

  return <Dashboard />;
}

function Dashboard() {
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
          userLabel='Nuvairea'
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
              <>
                <Tabs
                  tab={selectedTab}
                  onTabChange={setSelectedTab}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  monthBounds={monthBounds}
                />
                <NotesGrid
                  view={view}
                  search={searchQuery}
                  tab={selectedTab}
                  month={selectedMonth}
                  onOpenNote={openExistingNote}
                  onViewChange={setView}
                />
              </>
            )}

            <NoteEditorModal open={editorOpen} note={editingNote} onClose={() => setEditorOpen(false)} />
            {view === 'trash' && <div className={styles.notesList} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
