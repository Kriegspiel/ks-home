(() => {
  const root = document.documentElement;
  const button = document.querySelector('[data-theme-toggle]');
  const menu = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.site-nav');
  const header = document.querySelector('.site-header');
  const meta = document.querySelector('meta[name="theme-color"]');
  const storageKey = 'kriegspiel-theme';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    meta?.setAttribute('content', theme === 'dark' ? '#100d0a' : '#fafcfe');
    button?.setAttribute('aria-pressed', String(theme === 'dark'));
    button?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }

  function syncHeaderHeight() {
    root.style.setProperty('--tier-feature-sticky-top', `${Math.ceil(header?.getBoundingClientRect().height || 0)}px`);
  }

  function setMenu(open) {
    if (!menu || !nav) return;
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Close' : 'Menu';
    nav.dataset.open = String(open);
    syncHeaderHeight();
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  button?.addEventListener('click', () => {
    const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { window.localStorage.setItem(storageKey, theme); } catch { /* Theme still works without storage. */ }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey) applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
  });
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) setMenu(false);
    syncHeaderHeight();
  }, { passive: true });
  syncHeaderHeight();
})();
