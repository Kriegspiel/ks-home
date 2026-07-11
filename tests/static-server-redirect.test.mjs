import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

test('static server redirects the public subscription route to the app page', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-home-static-'));
  fs.writeFileSync(path.join(root, 'index.html'), 'ok\n', 'utf8');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const port = await availablePort();
  const child = spawn(process.execPath, [
    'scripts/serve-static.mjs',
    '--root',
    root,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(() => {
    child.kill();
  });

  await waitForServer(`http://127.0.0.1:${port}/`);

  for (const route of ['/subscription', '/subscription/']) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://app.kriegspiel.org/subscription');
  }
});

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}
