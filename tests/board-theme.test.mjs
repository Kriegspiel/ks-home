import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHomePage, renderBlogDetail } from '../src/pages.mjs';
import { markdownToHtml } from '../src/content-utils.mjs';

const lightPalette = {
  '--ks-square-light': '#f7fafc',
  '--ks-square-dark': '#d9e4ed',
  '--ks-board-edge': '#c2d0dc',
  '--ks-highlight': '#bbcfdc',
  '--ks-board-bg': '#fafcfe',
  '--ks-board-text': '#18242f',
  '--ks-board-muted': '#526576',
};
const darkPalette = {
  '--ks-square-light': '#dac5a6',
  '--ks-square-dark': '#a47c59',
  '--ks-board-edge': '#8c6849',
  '--ks-highlight': '#c5ae78',
  '--ks-board-bg': '#dac5a6',
  '--ks-board-text': '#241b13',
  '--ks-board-muted': '#241b13',
};

const article = {
  metadata: {
    slug: 'board-theme-example',
    title: 'Board theme example',
    summary: 'A board shared with the homepage palette.',
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
    tags: [],
  },
  body: 'Diagram FEN: `1n2k1K1/7R/8/4N3/6N1/8/8/8 w - - 0 1`',
};
article.bodyHtml = markdownToHtml(article.body);

function boardPalette(html, selector) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map(match => match[1]).join('\n');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(rule, `missing ${selector} theme rule`);
  return Object.fromEntries([...rule[1].matchAll(/(--ks-(?:square|board|highlight)[\w-]*)\s*:\s*([^;]+);/g)]
    .map(([, name, value]) => [name, value.trim()]));
}

for (const [name, html] of [
  ['homepage', renderHomePage({ homeContent: {} })],
  ['article diagram', renderBlogDetail(article)],
]) {
  test(`${name} emits the approved light and dark board palettes`, () => {
    assert.deepEqual(boardPalette(html, ':root'), lightPalette);
    assert.deepEqual(boardPalette(html, 'html[data-theme="dark"]'), darkPalette);
    assert.ok(html.includes('/chess/cburnett/'), 'keep the existing piece artwork');
    assert.ok(html.includes('/site-shell.js?v='), 'keep the shared theme control');
  });
}
