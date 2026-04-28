import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

test('build emits required public pages', () => {
  execSync('node scripts/build.mjs', { stdio: 'pipe' });
  for (const routeFile of ['index.html', 'leaderboard/index.html', 'blog/index.html', 'blog/archive/index.html', 'blog/welcome/index.html', 'changelog/index.html', 'changelog/2026-03-27-slice-940-trust-discoverability/index.html', 'rules/index.html', 'rules/berkeley/index.html', 'rules/wild16/index.html', 'rules/rand/index.html', 'rules/english/index.html', 'rules/crazykrieg/index.html', 'rules/comparison/index.html', 'privacy/index.html', 'terms/index.html']) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', routeFile)), `missing ${routeFile}`);
  }
});
