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
  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'logo-theme-toggle.png')), 'missing hero/theme-toggle logo');
  for (const [name, budget] of [['logo-theme-toggle-96.webp', 8192], ['logo-hero-1024.webp', 100000]]) {
    const asset = fs.readFileSync(path.join(process.cwd(), 'dist', name));
    assert.equal(asset.toString('ascii', 0, 4), 'RIFF');
    assert.equal(asset.toString('ascii', 8, 12), 'WEBP');
    assert.ok(asset.length < budget, `${name} exceeds its page-load byte budget`);
  }
  for (const route of ['index.html', 'rules/index.html', 'rules/comparison/index.html']) {
    const html = fs.readFileSync(path.join(process.cwd(), 'dist', route), 'utf8');
    assert.ok(html.includes('src="/logo-theme-toggle-96.webp" width="96" height="96"'));
    assert.ok(!html.includes('background:url("/logo-hero-1024.webp")'), 'removed watermark must not be requested');
    assert.ok(html.includes('/site-shell.js?v='));
    assert.ok(html.includes('aria-controls="site-navigation"'));
    assert.ok(html.includes('--bg: #fafcfe;'));
    assert.ok(!html.includes('/logo-theme-toggle.png'), 'page still requests the oversized logo');
  }

  assert.ok(fs.existsSync(path.join(process.cwd(), 'dist', 'social-card-20260511.png')), 'missing social-card-20260511.png');
  const socialImage = fs.readFileSync(path.join(process.cwd(), 'dist', 'social-card-20261114.png'));
  assert.equal(socialImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'social image must be a PNG');
  assert.equal(socialImage.toString('ascii', 12, 16), 'IHDR');
  assert.equal(socialImage.readUInt32BE(16), 1200);
  assert.equal(socialImage.readUInt32BE(20), 630);
  for (const route of ['index.html', 'rules/berkeley/index.html', 'blog/welcome/index.html']) {
    const html = fs.readFileSync(path.join(process.cwd(), 'dist', route), 'utf8');
    for (const attribute of ['property="og:image"', 'property="og:image:secure_url"', 'name="twitter:image"']) {
      assert.ok(html.includes(`<meta ${attribute} content="https://kriegspiel.org/social-card-20261114.png"`), `${route}: missing current social image`);
    }
    for (const attribute of ['property="og:image:alt"', 'name="twitter:image:alt"']) {
      assert.ok(html.includes(`<meta ${attribute} content="Kriegspiel. Chess. Beyond what you can see. A board showing only White’s pieces."`), `${route}: missing matching alt text`);
    }
    if (route.startsWith('blog/')) {
      const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      const article = structuredData.find(item => item['@type'] === 'BlogPosting');
      assert.ok(article, 'article structured data exists');
      assert.equal(article.image, 'https://kriegspiel.org/social-card-20261114.png');
    }
  }
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
