import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRedirectPage } from '../src/pages.mjs';

test('public subscription route redirects to the canonical app subscription page', () => {
  const html = renderRedirectPage({
    fromPath: '/subscription',
    toPath: 'https://app.kriegspiel.org/subscription',
    title: 'Subscription moved',
  });

  assert.ok(html.includes('Kriegspiel — Subscription moved'));
  assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=https://app.kriegspiel.org/subscription" />'));
  assert.ok(html.includes('<link rel="canonical" href="https://app.kriegspiel.org/subscription" />'));
  assert.ok(html.includes('This page moved to <a class="text-link" href="https://app.kriegspiel.org/subscription">https://app.kriegspiel.org/subscription</a>.'));
  assert.ok(!html.includes('Kriegspiel levels'));
  assert.ok(!html.includes('Create free profile'));
  assert.ok(!html.includes('Manage billing'));
  assert.ok(!html.includes('Open payment form'));
  assert.ok(!html.includes('Selected'));
  assert.ok(!html.includes('Current level'));
  assert.ok(!html.includes('Current tier'));
  assert.ok(!html.includes('Bot availability'));
  const navHtml = html.match(/<nav class="site-nav" aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.ok(!navHtml.includes('>Subscription</a>'));
  const gameFooterHtml = html.match(/<section class="footer__group" aria-label="Game">([\s\S]*?)<\/section>/)?.[1] || '';
  assert.ok(gameFooterHtml.includes('<a class="footer__link" href="/subscription">Subscription</a>'));
});
