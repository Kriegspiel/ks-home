import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

test('build emits required public pages', () => {
  execSync('node scripts/build.mjs', { stdio: 'pipe' });
  for (const routeFile of ['index.html', 'leaderboard/index.html', 'blog/index.html', 'blog/archive/index.html', 'blog/welcome/index.html', 'changelog/index.html', 'changelog/2026-03-27-slice-940-trust-discoverability/index.html', 'rules/index.html', 'rules/berkeley/index.html', 'rules/wild16/index.html', 'rules/rand/index.html', 'rules/english/index.html', 'rules/crazykrieg/index.html', 'rules/comparison/index.html', 'subscription/index.html', 'playing/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', routeFile)), `missing ${routeFile}`);
  }
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'dist', 'levels/index.html')), 'levels page should not be emitted');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'social-card-20260511.png')), 'missing social-card-20260511.png');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'social/reddit/2026-05-ruleset-default/kriegspiel-ruleset-default-reddit.gif')), 'missing Reddit ruleset GIF');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'social/reddit/2026-05-ruleset-default/kriegspiel-ruleset-default-reddit.png')), 'missing Reddit ruleset PNG');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'fen-board.js')), 'missing fen-board.js');
  for (const xmlFile of ['feed.xml', 'atom.xml', 'sitemap.xml']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', xmlFile)), `missing ${xmlFile}`);
  }
  const feed = fs.readFileSync(path.join(process.cwd(), 'dist', 'feed.xml'), 'utf8');
  const atom = fs.readFileSync(path.join(process.cwd(), 'dist', 'atom.xml'), 'utf8');
  const sitemap = fs.readFileSync(path.join(process.cwd(), 'dist', 'sitemap.xml'), 'utf8');
  assert.ok(feed.includes('<rss version="2.0"'));
  assert.ok(atom.includes('<feed xmlns="http://www.w3.org/2005/Atom"'));
  assert.ok(sitemap.includes('https://kriegspiel.org/rules/berkeley'));
  assert.ok(!sitemap.includes('https://kriegspiel.org/subscription'));
  assert.ok(sitemap.includes('https://kriegspiel.org/playing'));
  assert.ok(!sitemap.includes('https://kriegspiel.org/levels'));
  assert.ok(sitemap.includes('<lastmod>'));
});
