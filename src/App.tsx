import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import styles from './App.module.css';

function App() {
  const [view, setView] = useState<'notes' | 'trash'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={styles.page}>
      <div className={styles.appFrame}>
        <Sidebar
          view={view}
          onViewChange={setView}
          onAddNote={() => console.log('add note clicked')}
          onOpenSettings={() => console.log('settings clicked')}
          userLabel='Nuvairea'
        />
        <main className={styles.main}>
          <TopHeader
            title={view === 'notes' ? 'My Notes' : 'Trash'}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <div className={styles.content}>Main content goes here</div>
        </main>
      </div>
    </div>
  );
}

export default App;
