import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getContentRoot, loadCollection, loadSingletonEntry } from '../src/content-utils.mjs';
import { renderHomePage, renderLeaderboardPage, renderSimplePage, renderBlogIndex, renderBlogDetail, renderBlogArchive, renderChangelogIndex, renderChangelogDetail, renderRulesPage, renderRuleDetailPage, renderRulesComparisonPage, renderRedirectPage, renderSiteMarkdownPage } from '../src/pages.mjs';

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
  { handle: 'RefereeFox', rating: 1968, gamesPlayed: 122, trend: 'up' },
  { handle: 'BlindKnight', rating: 1889, gamesPlayed: 98, trend: 'flat' },
  { handle: 'FileWhisperer', rating: 1801, gamesPlayed: 87, trend: 'down' }
];

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

writePage(path.join(dist, 'index.html'), renderHomePage({ rulesCount: rulesEntries.length, blogCount: blogEntries.length, homeContent: homeEntry, footerEntry }));
writePage(path.join(dist, 'leaderboard/index.html'), renderLeaderboardPage(seedLeaderboard, footerEntry));
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
writePage(path.join(dist, 'rules/wild-16/index.html'), renderRedirectPage({ fromPath: '/rules/wild-16', toPath: '/rules/wild16', title: 'Rules route updated', footerEntry }));

writeJson(path.join(dist, '.regen-manifest.json'), {
  generatedAt: new Date().toISOString(),
  sourceHash: createHash('sha256').update(JSON.stringify({ blog: blogEntries.map((e) => [e.file, e.metadata.updatedAt]), changelog: changelogEntries.map((e) => [e.file, e.metadata.updatedAt]), rules: rulesEntries.map((e) => [e.file, e.metadata.updatedAt]), site: [[homeEntry.file, homeEntry.metadata.updatedAt], [privacyEntry.file, privacyEntry.metadata.updatedAt], [termsEntry.file, termsEntry.metadata.updatedAt], [aboutEntry.file, aboutEntry.metadata.updatedAt], [footerEntry.file, footerEntry.metadata.updatedAt]] })).digest('hex'),
  blogRoutes: blogEntries.map((entry) => `/blog/${entry.metadata.slug}`),
  changelogRoutes: changelogEntries.map((entry) => `/changelog/${entry.metadata.slug}`),
  ruleRoutes: ['/rules', '/rules/comparison', ...rulesEntries.map((entry) => `/rules/${entry.metadata.slug}`)]
});

console.log('build complete: marketing + blog + changelog + rules routes generated');

function writePage(filePath, html) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, html, 'utf8'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }

function copyStaticAsset(fromRelative, toRelative) { const from = path.resolve(process.cwd(), fromRelative); const to = path.join(dist, toRelative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function copyContentAsset(fromRelative, toRelative) { const from = path.join(contentRoot, fromRelative); const to = path.join(dist, toRelative); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
