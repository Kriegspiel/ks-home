import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../static/site-shell.js', import.meta.url), 'utf8');

function setup({ theme = null, denyStorage = false, missingControls = false } = {}) {
  const listeners = new Map();
  const element = (name) => ({
    attributes: new Map(), dataset: {}, textContent: '',
    setAttribute(key, value) { this.attributes.set(key, value); },
    getAttribute(key) { return this.attributes.get(key) ?? null; },
    addEventListener(type, handler) { listeners.set(`${name}:${type}`, handler); },
    focus() { document.activeElement = this; },
  });
  const properties = new Map();
  const root = element('root');
  root.style = { setProperty: (key, value) => properties.set(key, value) };
  if (theme !== null) root.setAttribute('data-theme', theme);
  const body = element('body');
  const button = element('theme');
  const menu = element('menu');
  menu.setAttribute('aria-expanded', 'false');
  const nav = element('nav');
  const meta = element('meta');
  const header = { getBoundingClientRect: () => ({ height: nav.dataset.open === 'true' ? 115.25 : 53 }) };
  const nodes = new Map([
    ['[data-theme-toggle]', button], ['[data-menu-toggle]', menu],
    ['.site-nav', nav], ['.site-header', header], ['meta[name="theme-color"]', meta],
  ]);
  const document = {
    documentElement: root, body, activeElement: null,
    querySelector: selector => missingControls ? null : nodes.get(selector),
    addEventListener: (type, handler) => listeners.set(`document:${type}`, handler),
  };
  const stored = new Map();
  const window = {
    innerWidth: 390,
    localStorage: { setItem(key, value) { if (denyStorage) throw new Error('Storage denied'); stored.set(key, value); } },
    addEventListener: (type, handler) => listeners.set(`window:${type}`, handler),
  };
  runInNewContext(source, { document, window }, { filename: 'site-shell.js' });
  return {
    root, body, button, menu, nav, meta, properties, document, window, stored,
    fire(target, type, event = {}) { listeners.get(`${target}:${type}`)?.(event); },
  };
}

test('shared shell applies the initial theme to the body, browser chrome, and logo action', () => {
  for (const initial of [null, 'light', 'dark', 'unexpected']) {
    const state = setup({ theme: initial });
    const dark = initial === 'dark';
    assert.equal(state.root.getAttribute('data-theme'), dark ? 'dark' : 'light');
    assert.equal(state.body.getAttribute('data-theme'), dark ? 'dark' : 'light');
    assert.equal(state.meta.getAttribute('content'), dark ? '#100d0a' : '#fafcfe');
    assert.equal(state.button.getAttribute('aria-pressed'), String(dark));
    assert.equal(state.button.getAttribute('aria-label'), `Switch to ${dark ? 'light' : 'dark'} theme`);
    assert.equal(state.properties.get('--tier-feature-sticky-top'), '53px');
  }
});

test('logo toggles and persists both themes while remaining usable with denied storage', () => {
  for (const denyStorage of [false, true]) {
    const state = setup({ denyStorage });
    state.fire('theme', 'click');
    assert.equal(state.body.getAttribute('data-theme'), 'dark');
    assert.equal(state.button.getAttribute('aria-label'), 'Switch to light theme');
    assert.equal(state.stored.get('kriegspiel-theme'), denyStorage ? undefined : 'dark');
    state.fire('theme', 'click');
    assert.equal(state.body.getAttribute('data-theme'), 'light');
    assert.equal(state.button.getAttribute('aria-pressed'), 'false');
    assert.equal(state.stored.get('kriegspiel-theme'), denyStorage ? undefined : 'light');
  }
});

test('theme changes in another tab synchronize without rewriting storage', () => {
  const state = setup();
  state.fire('window', 'storage', { key: 'unrelated', newValue: 'dark' });
  assert.equal(state.root.getAttribute('data-theme'), 'light');
  state.fire('window', 'storage', { key: 'kriegspiel-theme', newValue: 'dark' });
  assert.equal(state.root.getAttribute('data-theme'), 'dark');
  assert.equal(state.button.getAttribute('aria-pressed'), 'true');
  for (const newValue of [null, 'unexpected', 'light']) {
    state.fire('window', 'storage', { key: 'kriegspiel-theme', newValue });
    assert.equal(state.root.getAttribute('data-theme'), 'light');
  }
  assert.equal(state.stored.size, 0);
});

test('mobile menu keeps its label, visibility and sticky table offset in sync', () => {
  const state = setup();
  state.fire('menu', 'click');
  assert.equal(state.menu.getAttribute('aria-expanded'), 'true');
  assert.equal(state.menu.textContent, 'Close');
  assert.equal(state.nav.dataset.open, 'true');
  assert.equal(state.properties.get('--tier-feature-sticky-top'), '116px');
  state.fire('nav', 'click', { target: { closest: () => null } });
  assert.equal(state.nav.dataset.open, 'true', 'non-link navigation clicks preserve the menu');
  state.fire('nav', 'click', { target: { closest: selector => selector === 'a' } });
  assert.equal(state.menu.getAttribute('aria-expanded'), 'false');
  assert.equal(state.menu.textContent, 'Menu');
  assert.equal(state.nav.dataset.open, 'false');
  assert.equal(state.properties.get('--tier-feature-sticky-top'), '53px');
  state.fire('menu', 'click');
  state.fire('menu', 'click');
  assert.equal(state.nav.dataset.open, 'false', 'the menu button also closes navigation');
});

test('Escape closes an open menu and returns focus without hijacking unrelated keyboard input', () => {
  const state = setup();
  state.fire('document', 'keydown', { key: 'Escape' });
  assert.equal(state.document.activeElement, null);
  state.fire('menu', 'click');
  state.fire('document', 'keydown', { key: 'Enter' });
  assert.equal(state.nav.dataset.open, 'true');
  state.fire('document', 'keydown', { key: 'Escape' });
  assert.equal(state.nav.dataset.open, 'false');
  assert.equal(state.document.activeElement, state.menu);
  assert.equal(state.properties.get('--tier-feature-sticky-top'), '53px');
});

test('resizing to desktop clears the mobile menu and resynchronizes header height', () => {
  const state = setup();
  state.fire('menu', 'click');
  state.window.innerWidth = 760;
  state.fire('window', 'resize');
  assert.equal(state.nav.dataset.open, 'true');
  state.window.innerWidth = 761;
  state.fire('window', 'resize');
  assert.equal(state.nav.dataset.open, 'false');
  assert.equal(state.properties.get('--tier-feature-sticky-top'), '53px');
});

test('shell enhancement tolerates pages without optional controls or metadata', () => {
  const state = setup({ missingControls: true });
  assert.equal(state.body.getAttribute('data-theme'), 'light');
  assert.equal(state.properties.get('--tier-feature-sticky-top'), '0px');
  state.fire('document', 'keydown', { key: 'Escape' });
  state.window.innerWidth = 1440;
  state.fire('window', 'resize');
  state.fire('window', 'storage', { key: 'kriegspiel-theme', newValue: 'dark' });
  assert.equal(state.body.getAttribute('data-theme'), 'dark');
});
