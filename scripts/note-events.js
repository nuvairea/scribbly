import { debounce, setButtonLoading } from './app-utils.js';

export function bindNoteEvents({ manager, ui, elements, openModal, toggleSidebar }) {
  const {
    modal,
    searchInput,
    noteTitleInput,
    noteBodyInput,
    saveNoteBtn,
    tabIndicator,
  } = elements;

  let editingSnapshot = null;

  const resizeTextarea = () => {
    noteBodyInput.style.height = 'auto';

    const maxHeight = 400;
    const newHeight = Math.min(noteBodyInput.scrollHeight, maxHeight);

    noteBodyInput.style.height = `${newHeight}px`;
    noteBodyInput.style.overflowY = noteBodyInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const openNoteModal = (note = null) => {
    if (note) {
      ui.editingId = note.id;
      noteTitleInput.value = note.title;
      noteBodyInput.value = note.body;
      ui.color = note.color;
      editingSnapshot = { title: note.title, body: note.body, color: note.color };
    } else {
      ui.editingId = null;
      noteTitleInput.value = '';
      noteBodyInput.value = '';
      ui.color = '#eada76';
      editingSnapshot = null;
    }

    manager.setEditorPlaceholder(noteBodyInput);
    resizeTextarea();

    document.querySelectorAll('.dot').forEach((dot) => {
      dot.classList.toggle('selected', dot.dataset.color === ui.color);
    });

    modal.classList.add('active');
  };

  elements.noteBodyInput.addEventListener('input', resizeTextarea);

  elements.addNoteBtn.addEventListener('click', () => {
    openNoteModal();
    toggleSidebar(false);
  });

  elements.fabAddNote.addEventListener('click', () => {
    openNoteModal();
    toggleSidebar(false);
  });

  elements.closeModal.addEventListener('click', () => modal.classList.remove('active'));

  document.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', (event) => {
      document.querySelectorAll('.dot').forEach((colorDot) => colorDot.classList.remove('selected'));
      event.target.classList.add('selected');
      ui.color = event.target.dataset.color;
    });
  });

  elements.clearTrashBtn.addEventListener('click', async () => {
    const trashedCount = manager.notes.filter((note) => note.deleted).length;

    if (trashedCount === 0) {
      ui.showToast('Trash is already empty');
      return;
    }

    const confirmed = confirm(`Permanently delete ${trashedCount} note${trashedCount === 1 ? '' : 's'}? This can't be undone.`);
    if (!confirmed) return;

    await manager.emptyTrash();
    ui.render();
    ui.showToast('Trash emptied');
  });

  elements.exportNotesBtn.addEventListener('click', () => {
    const exportNotes = manager.notes
      .filter((note) => !note.deleted)
      .map(({ id, title, body, color, timestamp }) => ({ id, title, body, color, timestamp }));

    if (exportNotes.length === 0) {
      ui.showToast('No notes to export');
      return;
    }

    const blob = new Blob([JSON.stringify(exportNotes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scribbly-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    ui.showToast('Notes exported');
  });

  saveNoteBtn.addEventListener('click', async () => {
    const title = noteTitleInput.value;
    const body = noteBodyInput.value;

    if (!title && !body) return;

    const unchanged = ui.editingId
      && editingSnapshot
      && title === editingSnapshot.title
      && body === editingSnapshot.body
      && ui.color === editingSnapshot.color;

    if (unchanged) {
      modal.classList.remove('active');
      return;
    }

    setButtonLoading(saveNoteBtn, true);
    if (ui.editingId) {
      await manager.updateNote(ui.editingId, title, body, ui.color);
    } else {
      await manager.addNote(title, body, ui.color);
    }
    setButtonLoading(saveNoteBtn, false);
    modal.classList.remove('active');
    ui.render(searchInput.value);
  });

  elements.monthPrev.addEventListener('click', (event) => {
    if (event.target.classList.contains('hidden')) return;
    const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card')).map((card) => card.dataset.id);
    ui.shiftMonth(-1);
    ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
  });

  elements.monthNext.addEventListener('click', (event) => {
    if (event.target.classList.contains('hidden')) return;
    const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card')).map((card) => card.dataset.id);
    ui.shiftMonth(1);
    ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
  });

  elements.notesGrid.addEventListener('click', async (event) => {
    if (event.target.closest('[data-action="view-all"]')) {
      elements.navAll.click();
      return;
    }

    if (event.target.closest('[data-action="add-note"]') || event.target.closest('#trigger-new-note')) {
      openNoteModal();
      return;
    }

    const button = event.target.closest('.action-btn');
    if (button) {
      event.stopPropagation();
      await ui.animateRemoval(button.dataset.id);
      await manager.deleteNote(button.dataset.id);
      ui.render(searchInput.value);
      ui.showToast(ui.view === 'trash' ? 'Note restored' : 'Note moved to trash');
      return;
    }

    const card = event.target.closest('.note-card');
    if (card && ui.view === 'active') {
      const note = manager.getNote(card.dataset.id);
      if (note) openNoteModal(note);
    }
  });

  const moveTabIndicator = (tab) => {
    if (tab) {
      tabIndicator.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
    }
  };

  const activeTab = () => document.querySelector(`[data-tab="${ui.tab}"]`);
  const savedTab = activeTab();
  document.querySelector('.tab.active')?.classList.remove('active');
  savedTab?.classList.add('active');
  moveTabIndicator(savedTab);

  window.addEventListener('resize', () => moveTabIndicator(activeTab()));

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', (event) => {
      document.querySelectorAll('.tab').forEach((tabElement) => tabElement.classList.remove('active'));
      event.target.classList.add('active');
      moveTabIndicator(event.target);

      const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card')).map((card) => card.dataset.id);
      ui.tab = event.target.dataset.tab;
      localStorage.setItem('scribbly_last_tab', ui.tab);
      ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
    });
  });

  elements.navAll.addEventListener('click', (event) => {
    event.preventDefault();
    ui.view = 'active';
    elements.navAll.classList.add('active');
    elements.navTrash.classList.remove('active');
    toggleSidebar(false);
    ui.grid.classList.add('fade-out');
    setTimeout(() => {
      ui.render(searchInput.value, { animate: false });
      ui.grid.classList.remove('fade-out');
    }, 200);
  });

  elements.navTrash.addEventListener('click', (event) => {
    event.preventDefault();
    ui.view = 'trash';
    elements.navTrash.classList.add('active');
    elements.navAll.classList.remove('active');
    toggleSidebar(false);
    ui.grid.classList.add('fade-out');
    setTimeout(() => {
      ui.render(searchInput.value, { animate: false });
      ui.grid.classList.remove('fade-out');
    }, 200);
  });

  searchInput.addEventListener('input', debounce((event) => {
    ui.render(event.target.value, { animate: false });
  }, 150));

  return { openNoteModal, resizeTextarea };
}