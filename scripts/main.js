import { NotesManager } from './notes.js';
import { UI } from './ui.js';
import { signup, login, checkSession, logout, deleteAccount } from './auth.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            console.log('Service worker registered:', registration);
        }).catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const manager = new NotesManager();
    const ui = new UI(manager);

    const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    };

    const modal = document.getElementById('note-modal');
    const searchInput = document.getElementById('search-input');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const noteTitleInput = document.getElementById('note-title');
    const noteBodyInput = document.getElementById('note-body');

    const resizeTextarea = () => {
        noteBodyInput.style.height = 'auto';

        const maxHeight = 400;
        const newHeight = Math.min(noteBodyInput.scrollHeight, maxHeight);

        noteBodyInput.style.height = `${newHeight}px`;
        noteBodyInput.style.overflowY = noteBodyInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    noteBodyInput.addEventListener('input', resizeTextarea);

    localStorage.setItem('scribbly_last_tab', localStorage.getItem('scribbly_last_tab') || 'today');
    ui.tab = localStorage.getItem('scribbly_last_tab');
    ui.render();

    const themeColorMeta = document.getElementById('theme-color-meta');
    const syncThemeColor = () => {
        themeColorMeta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);

    const THEME_KEY = 'scribbly_theme'; // 'system' | 'light' | 'dark'

    const applyTheme = (theme) => {
        document.documentElement.classList.add('theme-changing');

        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        syncThemeColor();
        themeToggle.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.themeOption === theme);
        });

        requestAnimationFrame(() => {
            document.documentElement.classList.remove('theme-changing');
        });
    };

    const setTheme = (theme) => {
        localStorage.setItem(THEME_KEY, theme);
        applyTheme(theme);
    };

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', (e) => {
        const option = e.target.closest('.theme-option');
        if (!option) return;
        setTheme(option.dataset.themeOption);
    });

    const initialTheme = localStorage.getItem(THEME_KEY) || 'system';
    applyTheme(initialTheme);

    const toggleSidebar = (show) => {
        if (show) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            accountDropdown.classList.remove('open');
            navAccountWrap.classList.remove('dropdown-open');
        }
    };

    hamburgerBtn.addEventListener('click', () => toggleSidebar(true));
    overlay.addEventListener('click', () => toggleSidebar(false));

    let editingSnapshot = null;

    const openModal = (note = null) => {
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

    document.getElementById('btn-add-note').addEventListener('click', () => {
        openModal();
        toggleSidebar(false);
    });

    document.getElementById('fab-add-note').addEventListener('click', () => {
        openModal();
        toggleSidebar(false);
    });

    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('active'));

    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('selected'));
            e.target.classList.add('selected');
            ui.color = e.target.dataset.color;
        });
    });

    const btnClearTrash = document.getElementById('btn-clear-trash');

    btnClearTrash.addEventListener('click', async () => {
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

    const btnExportNotes = document.getElementById('btn-export-notes');

    btnExportNotes.addEventListener('click', () => {
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

    const saveNoteBtn = document.getElementById('save-note-btn');
    saveNoteBtn.addEventListener('click', async () => {
        const title = noteTitleInput.value;
        const body = noteBodyInput.value;

        if (title || body) {
            if (ui.editingId) {
                const unchanged = editingSnapshot
                    && title === editingSnapshot.title
                    && body === editingSnapshot.body
                    && ui.color === editingSnapshot.color;

                if (unchanged) {
                    modal.classList.remove('active');
                    return;
                }

                setButtonLoading(saveNoteBtn, true);
                await manager.updateNote(ui.editingId, title, body, ui.color);
            } else {
                setButtonLoading(saveNoteBtn, true);
                await manager.addNote(title, body, ui.color);
            }

            setButtonLoading(saveNoteBtn, false);
            modal.classList.remove('active');
            ui.render(searchInput.value);
        }
    });

    document.getElementById('month-prev').addEventListener('click', (e) => {
        if (e.target.classList.contains('hidden')) return;

        const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card'))
            .map(card => card.dataset.id);

        ui.shiftMonth(-1);
        ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
    });

    document.getElementById('month-next').addEventListener('click', (e) => {
        if (e.target.classList.contains('hidden')) return;

        const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card'))
            .map(card => card.dataset.id);

        ui.shiftMonth(1);
        ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
    });

    document.getElementById('notes-grid').addEventListener('click', async (e) => {
        if (e.target.closest('[data-action="view-all"]')) {
            document.getElementById('nav-all').click();
            return;
        }

        if (e.target.closest('[data-action="add-note"]')) {
            openModal();
            return;
        }

        if (e.target.closest('#trigger-new-note')) {
            openModal();
            return;
        }

        const btn = e.target.closest('.action-btn');
        if (btn) {
            e.stopPropagation();
            const id = btn.dataset.id;
            await ui.animateRemoval(id);
            await manager.deleteNote(id);
            ui.render(searchInput.value);

            ui.showToast(ui.view === 'trash' ? 'Note restored' : 'Note moved to trash');
            return;
        }

        const card = e.target.closest('.note-card');
        if (card && ui.view === 'active') {
            const note = manager.getNote(card.dataset.id);
            if (note) openModal(note);
        }
    });

    const tabIndicator = document.getElementById('tab-indicator');
    const moveTabIndicator = (tabEl) => {
        if (!tabEl) return;
        tabIndicator.style.transform = `translateX(${tabEl.offsetLeft}px) scaleX(${tabEl.offsetWidth})`;
    };

    const savedTabEl = document.querySelector(`.tab[data-tab="${ui.tab}"]`);
    const currentActiveTab = document.querySelector('.tab.active');
    if (currentActiveTab && currentActiveTab !== savedTabEl) {
        currentActiveTab.classList.remove('active');
    }
    if (savedTabEl) {
        savedTabEl.classList.add('active');
    }
    moveTabIndicator(savedTabEl);

    window.addEventListener('resize', () => moveTabIndicator(document.querySelector(`[data-tab="${ui.tab}"]`)));

    document.querySelectorAll('.tab').forEach(tabEl => {
        tabEl.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            moveTabIndicator(e.target);

            // Capture current note IDs before switching tabs
            const previousNoteIds = Array.from(ui.grid.querySelectorAll('.note-card'))
                .map(card => card.dataset.id);

            ui.tab = e.target.dataset.tab;
            localStorage.setItem('scribbly_last_tab', ui.tab);

            // Use smart animation: only animate in/out cards that changed
            ui.render(searchInput.value, { smartAnimate: true, previousNoteIds });
        });
    });

    document.getElementById('nav-all').addEventListener('click', (e) => {
        ui.view = 'active';
        document.getElementById('nav-all').classList.add('active');
        document.getElementById('nav-trash').classList.remove('active');
        toggleSidebar(false);

        ui.grid.classList.add('fade-out');
        setTimeout(() => {
            ui.render(searchInput.value, { animate: false });
            ui.grid.classList.remove('fade-out');
        }, 200);
    });

    document.getElementById('nav-trash').addEventListener('click', (e) => {
        ui.view = 'trash';
        document.getElementById('nav-trash').classList.add('active');
        document.getElementById('nav-all').classList.remove('active');
        toggleSidebar(false);

        ui.grid.classList.add('fade-out');
        setTimeout(() => {
            ui.render(searchInput.value, { animate: false });
            ui.grid.classList.remove('fade-out');
        }, 200);
    });

    searchInput.addEventListener('input', debounce((e) => {
        ui.render(e.target.value, { animate: false });
    }, 150));

    const deleteAccBtn = document.getElementById('btn-delete-account');

    deleteAccBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const confirmed = confirm("Permanently delete your account and all synced notes? This can't be undone.");
        if (!confirmed) return;

        setButtonLoading(deleteAccBtn, true);
        const previousUserId = manager.userId;
        const result = await deleteAccount();
        setButtonLoading(deleteAccBtn, false);

        if (!result.ok) {
            ui.showToast(result.data?.error || 'Failed to delete account');
            return;
        }

        localStorage.removeItem(LAST_SESSION_KEY);
        localStorage.removeItem(ACCOUNT_LABEL_KEY);
        localStorage.removeItem(GUEST_KEY);

        if (previousUserId) {
            localStorage.removeItem(`scribbly_notes_cache_${previousUserId}`);
        }

        navAccountWrap.classList.remove('authed');
        navAccountLabel.textContent = 'Log in';

        await manager.setAuthContext(false);
        manager.notes = [];
        localStorage.removeItem('scribbly_data');
        ui.render(searchInput.value);

        closeSettingsModal();
        ui.showToast('Account deleted');
    });

    // --- Auth ---
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchMsg = document.getElementById('auth-switch-msg');
    const authSwitchLink = document.getElementById('auth-switch-link');
    const authGuestLink = document.getElementById('auth-guest-link');
    const navAccountLabel = document.getElementById('nav-account-label');
    const navAccountWrap = document.getElementById('nav-account-wrap');
    const accountDropdown = document.getElementById('account-dropdown');
    const btnLogout = document.getElementById('btn-logout');
    const togglePasswordBtn = document.getElementById('toggle-auth-password');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal');
    const settingsAuthedSection = document.querySelector('.settings-account-authed');
    const settingsGuestSection = document.querySelector('.settings-account-guest');

    const GUEST_KEY = 'scribbly_guest_dismissed';
    const ACCOUNT_LABEL_KEY = 'scribbly_account_label';
    let authMode = 'login';

    const SPINNER_MARKUP = '<span class="btn-spinner" aria-hidden="true">'
        + '<span></span>'.repeat(8)
        + '</span>';

    const setButtonLoading = (btn, isLoading) => {
        if (isLoading) {
            btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = SPINNER_MARKUP;
        } else {
            btn.disabled = false;
            if (btn.dataset.originalHtml !== undefined) {
                btn.innerHTML = btn.dataset.originalHtml;
            }
        }
    };

    const formatAccountLabel = (email) => {
        const username = String(email || '').split('@')[0] || 'Account';
        return username.length > 10 ? username.slice(0, 10) + '...' : username;
    };

    const setAccountLabel = (value) => {
        const label = formatAccountLabel(value);
        navAccountLabel.textContent = label;
        localStorage.setItem(ACCOUNT_LABEL_KEY, label);
        navAccountWrap.classList.add('authed');
    };

    const closeAccountDropdown = () => {
        accountDropdown.classList.remove('open');
        navAccountWrap.classList.remove('dropdown-open');
    };

    const toggleAccountDropdown = () => {
        const willOpen = !accountDropdown.classList.contains('open');
        accountDropdown.classList.toggle('open', willOpen);
        navAccountWrap.classList.toggle('dropdown-open', willOpen);
    };

    const openAuthModal = () => {
        authError.textContent = '';
        authForm.reset();
        authModal.classList.add('active');
    };

    const closeAuthModal = () => authModal.classList.remove('active');

    const openSettingsModal = () => {
        toggleSidebar(false);
        settingsAuthedSection.classList.toggle('settings-hidden', !manager.isAuthenticated);
        settingsGuestSection.classList.toggle('settings-hidden', manager.isAuthenticated);
        settingsModal.classList.add('active');
    };
    const closeSettingsModal = () => settingsModal.classList.remove('active');

    document.getElementById('btn-settings-login').addEventListener('click', () => {
        closeSettingsModal();
        openAuthModal();
    });

    const setAuthMode = (mode) => {
        authMode = mode;
        document.querySelectorAll('.auth-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.authTab === mode);
        });
        authError.textContent = '';

        if (mode === 'login') {
            authSubmitBtn.textContent = 'Log in';
            authPasswordInput.autocomplete = 'current-password';
            authSwitchMsg.textContent = "Don't have an account?";
            authSwitchLink.textContent = 'Sign up';
        } else {
            authSubmitBtn.textContent = 'Sign up';
            authPasswordInput.autocomplete = 'new-password';
            authSwitchMsg.textContent = 'Already have an account?';
            authSwitchLink.textContent = 'Log in';
        }
    };

    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => setAuthMode(tab.dataset.authTab));
    });

    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(authMode === 'login' ? 'signup' : 'login');
    });

    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = authPasswordInput.type === 'password';
        authPasswordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
    });

    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);

    document.getElementById('nav-settings').addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });
    closeSettingsModalBtn.addEventListener('click', closeSettingsModal);

    const storedAccountLabel = localStorage.getItem(ACCOUNT_LABEL_KEY);
    if (storedAccountLabel) {
        navAccountLabel.textContent = storedAccountLabel;
    }

    document.getElementById('nav-account').addEventListener('click', (e) => {
        e.preventDefault();

        if (manager.isAuthenticated) {
            toggleAccountDropdown();
            return;
        }

        toggleSidebar(false);
        openAuthModal();
    });

    document.addEventListener('click', (e) => {
        if (!navAccountWrap.contains(e.target)) {
            closeAccountDropdown();
        }
    });

    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        setButtonLoading(btnLogout, true);

        const previousUserId = manager.userId;
        await logout().catch(() => { });

        localStorage.removeItem(LAST_SESSION_KEY);
        localStorage.removeItem(ACCOUNT_LABEL_KEY);
        localStorage.removeItem(GUEST_KEY);
        if (previousUserId) {
            localStorage.removeItem(`scribbly_notes_cache_${previousUserId}`);
        }

        navAccountWrap.classList.remove('authed');
        navAccountLabel.textContent = 'Log in';

        await manager.setAuthContext(false);
        manager.notes = [];
        localStorage.removeItem('scribbly_data');
        ui.render(searchInput.value);

        setButtonLoading(btnLogout, false);
        closeAccountDropdown();
        toggleSidebar(false);

        ui.showToast('Come back soon');
    });

    authGuestLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem(GUEST_KEY, 'true');
        navAccountLabel.textContent = 'Guest';
        localStorage.setItem(ACCOUNT_LABEL_KEY, 'Guest');
        navAccountWrap.classList.remove('authed');
        closeAuthModal();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        setButtonLoading(authSubmitBtn, true);

        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;
        const action = authMode === 'login' ? login : signup;
        const result = await action(email, password);

        setButtonLoading(authSubmitBtn, false);

        if (!result.ok) {
            authError.textContent = result.data.error || 'Something went wrong';
            return;
        }

        if (authMode === 'signup') {
            const loginResult = await login(email, password);
            if (!loginResult.ok) {
                authError.textContent = 'Account created — please log in';
                setAuthMode('login');
                return;
            }
        }

        localStorage.removeItem(GUEST_KEY);

        setAccountLabel(email);
        const loggedInUserId = result.data?.userId || null;
        rememberLastSession(loggedInUserId, email);
        await manager.setAuthContext(true, loggedInUserId);
        ui.render(searchInput.value);
        closeAuthModal();

        ui.showToast(authMode === 'signup' ? 'Account created' : 'Welcome back');
    });

    const LAST_SESSION_KEY = 'scribbly_last_session';
    const rememberLastSession = (userId, email) => {
        localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ userId, email }));
    };
    const forgetLastSession = () => localStorage.removeItem(LAST_SESSION_KEY);

    checkSession().then(async (result) => {
        if (result.ok) {
            setAccountLabel(result.data.email);
            localStorage.removeItem(GUEST_KEY);
            rememberLastSession(result.data.userId, result.data.email);

            const before = JSON.stringify(manager.notes);
            await manager.setAuthContext(true, result.data.userId);
            if (JSON.stringify(manager.notes) !== before) {
                ui.render(searchInput.value);
            }
            return;
        }

        if (result.status === 0) {
            const lastSession = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) || 'null');
            if (lastSession) {
                setAccountLabel(lastSession.email);
                await manager.setAuthContext(true, lastSession.userId);
                ui.render(searchInput.value);
                return;
            }
        }

        forgetLastSession();
        if (!localStorage.getItem(GUEST_KEY)) {
            await manager.setAuthContext(false);
            openAuthModal();
        }
    }).catch(async () => {
        const lastSession = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) || 'null');
        if (lastSession) {
            setAccountLabel(lastSession.email);
            await manager.setAuthContext(true, lastSession.userId);
            ui.render(searchInput.value);
            return;
        }
        await manager.setAuthContext(false);
        if (!localStorage.getItem(GUEST_KEY)) {
            openAuthModal();
        }
    });
});