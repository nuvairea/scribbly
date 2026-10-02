import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Tabs } from './components/Tabs';
import { NotesGrid } from './components/NotesGrid';
import styles from './App.module.css';
import { useNotes } from './hooks/useNotes';
import { getMonthBounds, type MonthPosition } from './lib/NoteQueries';

function App() {
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

  return (
    <div className={styles.page}>
      <div className={styles.appFrame}>
        <Sidebar
          view={view}
          onViewChange={setView}
          onAddNote={() => console.log('add note clicked')}
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
                <NotesGrid search={searchQuery} tab={selectedTab} onAddNote={() => console.log('add note clicked')} />
              </>
            )}

            {view === 'trash' && <div className={styles.notesList} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
