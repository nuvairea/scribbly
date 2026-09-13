import { NotesManager } from './notes.js';
import { UI } from './ui.js';
import { bindAuthEvents } from './auth-events.js';
import { bindNoteEvents } from './note-events.js';
import { bindTheme } from './theme.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      console.log('Service worker registered:', registration);
    }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new NotesManager();
  const ui = new UI(manager);
  const elements = {
    modal: document.getElementById('note-modal'),
    searchInput: document.getElementById('search-input'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebar-overlay'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    noteTitleInput: document.getElementById('note-title'),
    noteBodyInput: document.getElementById('note-body'),
    saveNoteBtn: document.getElementById('save-note-btn'),
    tabIndicator: document.getElementById('tab-indicator'),
    notesGrid: document.getElementById('notes-grid'),
    addNoteBtn: document.getElementById('btn-add-note'),
    fabAddNote: document.getElementById('fab-add-note'),
    closeModal: document.getElementById('close-modal'),
    clearTrashBtn: document.getElementById('btn-clear-trash'),
    exportNotesBtn: document.getElementById('btn-export-notes'),
    monthPrev: document.getElementById('month-prev'),
    monthNext: document.getElementById('month-next'),
    navAll: document.getElementById('nav-all'),
    navTrash: document.getElementById('nav-trash'),
    themeToggle: document.getElementById('theme-toggle'),
    themeColorMeta: document.getElementById('theme-color-meta'),
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    authEmailInput: document.getElementById('auth-email'),
    authPasswordInput: document.getElementById('auth-password'),
    authError: document.getElementById('auth-error'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authSwitchMsg: document.getElementById('auth-switch-msg'),
    authSwitchLink: document.getElementById('auth-switch-link'),
    authGuestLink: document.getElementById('auth-guest-link'),
    navAccountLabel: document.getElementById('nav-account-label'),
    navAccountWrap: document.getElementById('nav-account-wrap'),
    accountDropdown: document.getElementById('account-dropdown'),
    navAccount: document.getElementById('nav-account'),
    navSettings: document.getElementById('nav-settings'),
    btnLogout: document.getElementById('btn-logout'),
    togglePasswordBtn: document.getElementById('toggle-auth-password'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsModalBtn: document.getElementById('close-settings-modal'),
    settingsAuthedSection: document.querySelector('.settings-account-authed'),
    settingsGuestSection: document.querySelector('.settings-account-guest'),
    settingsLoginBtn: document.getElementById('btn-settings-login'),
    closeAuthModal: document.getElementById('close-auth-modal'),
    deleteAccountBtn: document.getElementById('btn-delete-account'),
  };

  localStorage.setItem('scribbly_last_tab', localStorage.getItem('scribbly_last_tab') || 'today');
  ui.tab = localStorage.getItem('scribbly_last_tab');
  ui.render();

  const toggleSidebar = (show) => {
    elements.sidebar.classList.toggle('open', show);
    elements.overlay.classList.toggle('active', show);
    if (!show) {
      elements.accountDropdown.classList.remove('open');
      elements.navAccountWrap.classList.remove('dropdown-open');
    }
  };

  const closeSettingsModal = () => elements.settingsModal.classList.remove('active');

  elements.hamburgerBtn.addEventListener('click', () => toggleSidebar(true));
  elements.overlay.addEventListener('click', () => toggleSidebar(false));

  bindTheme(elements.themeToggle, elements.themeColorMeta);
  bindNoteEvents({ manager, ui, elements, toggleSidebar });
  bindAuthEvents({ manager, ui, elements, searchInput: elements.searchInput, toggleSidebar, closeSettingsModal });
});