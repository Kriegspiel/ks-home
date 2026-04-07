import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getContentRoot, loadCollection, loadSingletonEntry } from '../src/content-utils.mjs';
import { renderHomePage, renderLeaderboardPage, renderPublicProfilePage, renderSimplePage, renderBlogIndex, renderBlogDetail, renderBlogArchive, renderChangelogIndex, renderChangelogDetail, renderRulesPage, renderRuleDetailPage, renderRulesComparisonPage, renderRedirectPage, renderSiteMarkdownPage } from '../src/pages.mjs';

const dist = path.resolve(process.cwd(), 'dist');
const contentRoot = getContentRoot();
const blogEntries = loadCollection(contentRoot, 'blog');
const changelogEntries = loadCollection(contentRoot, 'changelog');
const rulesEntries = loadCollection(contentRoot, 'rules');
const homeEntry = loadSingletonEntry(contentRoot, 'site', 'home');
const privacyEntry = loadSingletonEntry(contentRoot, 'site', 'privacy');
const termsEntry = loadSingletonEntry(contentRoot, 'site', 'terms');
const aboutEntry = loadSingletonEntry(contentRoot, 'site', 'about');
const footerEntry = loadSingletonEntry(contentRoot, 'site', 'footer');

const seedLeaderboard = [
  { username: 'refereefox', handle: 'RefereeFox', label: 'RefereeFox', profilePath: '/players/refereefox', rating: 1968, gamesPlayed: 122, trend: 'up', isBot: false },
  { username: 'blindknight', handle: 'BlindKnight', label: 'BlindKnight', profilePath: '/players/blindknight', rating: 1889, gamesPlayed: 98, trend: 'flat', isBot: false },
  { username: 'filewhisperer', handle: 'FileWhisperer', label: 'FileWhisperer', profilePath: '/players/filewhisperer', rating: 1801, gamesPlayed: 87, trend: 'down', isBot: false }
];
const seedProfiles = new Map(seedLeaderboard.map((entry) => [
  entry.username,
  {
    profile: {
      username: entry.username,
      display_name: entry.label,
      role: entry.isBot ? 'bot' : 'user',
      is_bot: entry.isBot,
      profile: { bio: '', avatar_url: null, country: null },
      stats: {
        games_played: entry.gamesPlayed,
        games_won: Math.floor(entry.gamesPlayed * 0.55),
        games_lost: Math.floor(entry.gamesPlayed * 0.35),
        games_drawn: entry.gamesPlayed - Math.floor(entry.gamesPlayed * 0.55) - Math.floor(entry.gamesPlayed * 0.35),
        elo: entry.rating,
        elo_peak: entry.rating + 24,
      },
      member_since: '2026-03-27T00:00:00.000Z',
    },
    games: Array.from({ length: 8 }, (_, index) => ({
      game_id: `${entry.username}-${index + 1}`,
      opponent: index % 2 === 0 ? 'trainingbot' : 'rival',
      result: index % 3 === 0 ? 'win' : (index % 3 === 1 ? 'loss' : 'draw'),
      played_at: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
      elo_after: entry.rating - 28 + (index * 8),
      elo_delta: index % 3 === 0 ? 12 : (index % 3 === 1 ? -7 : 0),
    })),
  },
]));
const apiBase = process.env.KS_API_BASE ? process.env.KS_API_BASE.replace(/\/$/, '') : '';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
copyStaticAsset('public_html/logo-theme-toggle.png', 'logo-theme-toggle.png');
copyContentAsset('binary/logo/favicon.ico', 'favicon.ico');
copyContentAsset('binary/logo/favicon-16x16.png', 'favicon-16x16.png');
copyContentAsset('binary/logo/favicon-32x32.png', 'favicon-32x32.png');
copyContentAsset('binary/logo/favicon-192.png', 'favicon-192.png');
copyContentAsset('binary/logo/favicon-512.png', 'favicon-512.png');
copyContentAsset('binary/logo/apple-touch-icon.png', 'apple-touch-icon.png');
copyContentAsset('binary/logo/site.webmanifest', 'site.webmanifest');

for (const section of ['blog', 'blog/archive', 'changelog']) {
  copyContentAsset('binary/logo/favicon.ico', `${section}/favicon.ico`);
  copyContentAsset('binary/logo/favicon-16x16.png', `${section}/favicon-16x16.png`);
  copyContentAsset('binary/logo/favicon-32x32.png', `${section}/favicon-32x32.png`);
  copyContentAsset('binary/logo/favicon-192.png', `${section}/favicon-192.png`);
  copyContentAsset('binary/logo/favicon-512.png', `${section}/favicon-512.png`);
  copyContentAsset('binary/logo/apple-touch-icon.png', `${section}/apple-touch-icon.png`);
  copyContentAsset('binary/logo/site.webmanifest', `${section}/site.webmanifest`);
}

const publicData = await loadPublicPlayerData();

writePage(path.join(dist, 'index.html'), renderHomePage({ rulesCount: rulesEntries.length, blogCount: blogEntries.length, homeContent: homeEntry, footerEntry }));
writePage(path.join(dist, 'leaderboard/index.html'), renderLeaderboardPage(publicData.entries, footerEntry));
writePage(path.join(dist, 'blog/index.html'), renderBlogIndex(blogEntries, footerEntry));
writePage(path.join(dist, 'blog/archive/index.html'), renderBlogArchive(blogEntries, footerEntry));
writePage(path.join(dist, 'changelog/index.html'), renderChangelogIndex(changelogEntries, footerEntry));
writePage(path.join(dist, 'rules/index.html'), renderRulesPage(rulesEntries, changelogEntries, footerEntry));
writePage(path.join(dist, 'rules/comparison/index.html'), renderRulesComparisonPage(rulesEntries, footerEntry));
writePage(path.join(dist, 'privacy/index.html'), renderSiteMarkdownPage(privacyEntry, footerEntry));
writePage(path.join(dist, 'terms/index.html'), renderSiteMarkdownPage(termsEntry, footerEntry));
writePage(path.join(dist, 'about/index.html'), renderSiteMarkdownPage(aboutEntry, footerEntry));
writePage(path.join(dist, '404.html'), renderSimplePage('Not Found', footerEntry));

for (const entry of blogEntries) writePage(path.join(dist, 'blog', entry.metadata.slug, 'index.html'), renderBlogDetail(entry, footerEntry));
for (const entry of changelogEntries) writePage(path.join(dist, 'changelog', entry.metadata.slug, 'index.html'), renderChangelogDetail(entry, footerEntry));
for (const entry of rulesEntries) writePage(path.join(dist, 'rules', entry.metadata.slug, 'index.html'), renderRuleDetailPage(entry, changelogEntries, footerEntry));
for (const profile of publicData.profiles) writePage(path.join(dist, 'players', profile.profile.username, 'index.html'), renderPublicProfilePage({ profile: profile.profile, games: profile.games, footerEntry }));
writePage(path.join(dist, 'rules/wild-16/index.html'), renderRedirectPage({ fromPath: '/rules/wild-16', toPath: '/rules/wild16', title: 'Rules route updated', footerEntry }));

writeJson(path.join(dist, '.regen-manifest.json'), {
  generatedAt: new Date().toISOString(),
  sourceHash: createHash('sha256').update(JSON.stringify({ blog: blogEntries.map((e) => [e.file, e.metadata.updatedAt]), changelog: changelogEntries.map((e) => [e.file, e.metadata.updatedAt]), rules: rulesEntries.map((e) => [e.file, e.metadata.updatedAt]), site: [[homeEntry.file, homeEntry.metadata.updatedAt], [privacyEntry.file, privacyEntry.metadata.updatedAt], [termsEntry.file, termsEntry.metadata.updatedAt], [aboutEntry.file, aboutEntry.metadata.updatedAt], [footerEntry.file, footerEntry.metadata.updatedAt]], players: publicData.entries.map((entry) => [entry.username, entry.rating, entry.gamesPlayed]) })).digest('hex'),
  blogRoutes: blogEntries.map((entry) => `/blog/${entry.metadata.slug}`),
  changelogRoutes: changelogEntries.map((entry) => `/changelog/${entry.metadata.slug}`),
  ruleRoutes: ['/rules', '/rules/comparison', ...rulesEntries.map((entry) => `/rules/${entry.metadata.slug}`)],
  playerRoutes: publicData.profiles.map((entry) => `/players/${entry.profile.username}`)
});

console.log('build complete: marketing + leaderboard + player profiles + blog + changelog + rules routes generated');

function writePage(filePath, html) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, html, 'utf8'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }

function copyStaticAsset(fromRelative, toRelative) { const from = path.resolve(process.cwd(), fromRelative); const to = path.join(dist, toRelative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function copyContentAsset(fromRelative, toRelative) { const from = path.join(contentRoot, fromRelative); const to = path.join(dist, toRelative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }

async function loadPublicPlayerData() {
  if (!apiBase) {
    return { entries: seedLeaderboard, profiles: [...seedProfiles.values()] };
  }

  const players = await loadLeaderboardEntriesFromApi();
  const profiles = [];
  for (const entry of players) {
    const username = String(entry.username || '').trim();
    if (!username) continue;
    const [profile, history] = await Promise.all([
      fetchJson(`${apiBase}/api/user/${encodeURIComponent(username)}`),
      fetchJson(`${apiBase}/api/user/${encodeURIComponent(username)}/games?page=1&per_page=20`),
    ]);
    profiles.push({
      profile,
      games: Array.isArray(history?.games) ? history.games : [],
    });
  }
  return { entries: players, profiles };
}

async function loadLeaderboardEntriesFromApi() {
  const perPage = 20;
  const firstPage = await fetchJson(`${apiBase}/api/leaderboard?page=1&per_page=${perPage}`);
  const pages = Number(firstPage?.pagination?.pages || 1);
  const players = Array.isArray(firstPage?.players) ? [...firstPage.players] : [];
  for (let page = 2; page <= pages; page += 1) {
    const payload = await fetchJson(`${apiBase}/api/leaderboard?page=${page}&per_page=${perPage}`);
    if (Array.isArray(payload?.players)) players.push(...payload.players);
  }
  return players.map((player) => ({
    username: player.username,
    handle: player.username,
    label: player.display_name || player.username,
    profilePath: player.profile_path || `/players/${player.username}`,
    rating: Number(player.elo || 1200),
    gamesPlayed: Number(player.games_played || 0),
    isBot: Boolean(player.is_bot),
  }));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}
