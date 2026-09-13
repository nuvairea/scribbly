import { login, signup, checkSession, logout, deleteAccount } from './auth.js';
import { setButtonLoading } from './app-utils.js';

const GUEST_KEY = 'scribbly_guest_dismissed';
const ACCOUNT_LABEL_KEY = 'scribbly_account_label';
const LAST_SESSION_KEY = 'scribbly_last_session';

export function bindAuthEvents({ manager, ui, elements, searchInput, toggleSidebar, closeSettingsModal }) {
  const {
    authModal,
    authForm,
    authEmailInput,
    authPasswordInput,
    authError,
    authSubmitBtn,
    authSwitchMsg,
    authSwitchLink,
    authGuestLink,
    navAccountLabel,
    navAccountWrap,
    accountDropdown,
    btnLogout,
    togglePasswordBtn,
    settingsModal,
    closeSettingsModalBtn,
    settingsAuthedSection,
    settingsGuestSection,
    deleteAccountBtn,
  } = elements;

  let authMode = 'login';

  const setAccountLabel = (value) => {
    const username = String(value || '').split('@')[0] || 'Account';
    const label = username.length > 10 ? `${username.slice(0, 10)}...` : username;
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

  elements.settingsLoginBtn.addEventListener('click', () => {
    closeSettingsModal();
    openAuthModal();
  });

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => setAuthMode(tab.dataset.authTab));
  });

  authSwitchLink.addEventListener('click', (event) => {
    event.preventDefault();
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  });

  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = authPasswordInput.type === 'password';
    authPasswordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  elements.closeAuthModal.addEventListener('click', closeAuthModal);
  elements.navSettings.addEventListener('click', (event) => {
    event.preventDefault();
    openSettingsModal();
  });
  closeSettingsModalBtn.addEventListener('click', closeSettingsModal);

  const storedAccountLabel = localStorage.getItem(ACCOUNT_LABEL_KEY);
  if (storedAccountLabel) navAccountLabel.textContent = storedAccountLabel;

  elements.navAccount.addEventListener('click', (event) => {
    event.preventDefault();
    if (manager.isAuthenticated) {
      toggleAccountDropdown();
    } else {
      toggleSidebar(false);
      openAuthModal();
    }
  });

  document.addEventListener('click', (event) => {
    if (!navAccountWrap.contains(event.target)) closeAccountDropdown();
  });

  btnLogout.addEventListener('click', async (event) => {
    event.preventDefault();
    setButtonLoading(btnLogout, true);
    const previousUserId = manager.userId;
    await logout().catch(() => { });

    localStorage.removeItem(LAST_SESSION_KEY);
    localStorage.removeItem(ACCOUNT_LABEL_KEY);
    localStorage.removeItem(GUEST_KEY);
    if (previousUserId) localStorage.removeItem(`scribbly_notes_cache_${previousUserId}`);

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

  authGuestLink.addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem(GUEST_KEY, 'true');
    navAccountLabel.textContent = 'Guest';
    localStorage.setItem(ACCOUNT_LABEL_KEY, 'Guest');
    navAccountWrap.classList.remove('authed');
    closeAuthModal();
  });

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
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

  deleteAccountBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    const confirmed = confirm("Permanently delete your account and all synced notes? This can't be undone.");
    if (!confirmed) return;

    setButtonLoading(deleteAccountBtn, true);
    const previousUserId = manager.userId;
    const result = await deleteAccount();
    setButtonLoading(deleteAccountBtn, false);

    if (!result.ok) {
      ui.showToast(result.data?.error || 'Failed to delete account');
      return;
    }

    localStorage.removeItem(LAST_SESSION_KEY);
    localStorage.removeItem(ACCOUNT_LABEL_KEY);
    localStorage.removeItem(GUEST_KEY);
    if (previousUserId) localStorage.removeItem(`scribbly_notes_cache_${previousUserId}`);

    navAccountWrap.classList.remove('authed');
    navAccountLabel.textContent = 'Log in';
    await manager.setAuthContext(false);
    manager.notes = [];
    localStorage.removeItem('scribbly_data');
    ui.render(searchInput.value);
    closeSettingsModal();
    ui.showToast('Account deleted');
  });

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
      if (JSON.stringify(manager.notes) !== before) ui.render(searchInput.value);
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
    if (!localStorage.getItem(GUEST_KEY)) openAuthModal();
  });
}