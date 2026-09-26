import { useNotes } from './context/NotesContext';

function App() {
  const { notes } = useNotes();

  return (
    <div>
      <h1>Scribbly</h1>
      <p>{notes.length} notes loaded</p>
    </div>
  );
}

export default App;