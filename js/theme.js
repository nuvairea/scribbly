const THEME_KEY = 'scribbly_theme';

export function bindTheme(themeToggle, themeColorMeta) {
  const syncThemeColor = () => {
    themeColorMeta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  };

  const applyTheme = (theme) => {
    document.documentElement.classList.add('theme-changing');

    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    syncThemeColor();
    themeToggle.querySelectorAll('.theme-option').forEach((option) => {
      option.classList.toggle('active', option.dataset.themeOption === theme);
    });

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('theme-changing');
    });
  };

  themeToggle.addEventListener('click', (event) => {
    const option = event.target.closest('.theme-option');
    if (option) {
      localStorage.setItem(THEME_KEY, option.dataset.themeOption);
      applyTheme(option.dataset.themeOption);
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);
  applyTheme(localStorage.getItem(THEME_KEY) || 'system');
}