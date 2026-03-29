
(function () {
  var STORAGE_KEY = 'kriegspiel-theme';
  var root = document.documentElement;
  var mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readStoredTheme() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function preferredTheme() {
    var stored = readStoredTheme();
    if (stored) return stored;
    return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.setAttribute('data-theme', theme);
    }

    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#100d0a' : '#f7efe3');
    }

    var button = document.querySelector('[data-theme-toggle]');
    if (button) {
      var nextTheme = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      button.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      button.setAttribute('data-next-theme', nextTheme);
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // ignore storage failures
    }
  }

  function toggleTheme() {
    var current = root.getAttribute('data-theme') || preferredTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    storeTheme(next);
    applyTheme(next);
  }

  root.setAttribute('data-theme', preferredTheme());
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(root.getAttribute('data-theme') || preferredTheme());
    var button = document.querySelector('[data-theme-toggle]');
    if (button) {
      button.addEventListener('click', toggleTheme);
    }
  });

  if (mediaQuery) {
    var onPreferenceChange = function (event) {
      if (!readStoredTheme()) {
        applyTheme(event.matches ? 'dark' : 'light');
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onPreferenceChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onPreferenceChange);
    }
  }
})();
