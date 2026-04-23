import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

test('build emits required public pages', () => {
  execSync('node scripts/build.mjs', { stdio: 'pipe' });
  for (const routeFile of ['index.html', 'leaderboard/index.html', 'blog/index.html', 'blog/archive/index.html', 'blog/welcome/index.html', 'changelog/index.html', 'changelog/2026-03-27-slice-940-trust-discoverability/index.html', 'rules/index.html', 'rules/berkeley/index.html', 'rules/wild16/index.html', 'rules/comparison/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', routeFile)), `missing ${routeFile}`);
  }
});

test('stage build emits isolated preview output with stage-only metadata', () => {
  const stageDist = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-home-stage-'));
  execSync('node scripts/build.mjs', {
    stdio: 'pipe',
    env: {
      ...process.env,
      KS_SITE_VARIANT: 'stage',
      KS_SITE_URL: 'https://www-stage.kriegspiel.org',
      KS_DIST_DIR: stageDist,
    },
  });

  const homeHtml = fs.readFileSync(path.join(stageDist, 'index.html'), 'utf8');
  assert.ok(homeHtml.includes('content="noindex, nofollow"'));
  assert.ok(homeHtml.includes('www-stage.kriegspiel.org'));
  assert.ok(homeHtml.includes('class="stage-hero"'));
  assert.ok(homeHtml.includes('src="/stage-knight.png"'));
  assert.ok(fs.existsSync(path.join(stageDist, 'stage-knight.png')));
});
