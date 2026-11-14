import { readFileSync } from 'node:fs';

import { sortEntries } from './leaderboard.mjs';
import { readingTimeMinutes } from './content-utils.mjs';
import { renderHomeDesign } from './home-design.mjs';

const SITE_URL = 'https://kriegspiel.org';
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const SOCIAL_CARD_PATH = '/social-card-20260511.png';
const SOCIAL_CARD_URL = absUrl(SOCIAL_CARD_PATH);
const SOCIAL_CARD_ALT = 'Kriegspiel hidden-information chess online.';
const FEED_TITLE = 'Kriegspiel Updates';
const RSS_FEED_URL = absUrl('/feed.xml');
const ATOM_FEED_URL = absUrl('/atom.xml');
const APP_ORIGIN = 'https://app.kriegspiel.org';
const APP_PLAY_URL = `${APP_ORIGIN}/`;

function esc(v = '') { return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function absUrl(path = '/') {
  const value = String(path || '/');
  if (/^https?:\/\//.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}
function appUrl(path = '/') { return `${APP_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`; }
const SITE_DESIGN_STYLES = readFileSync(new URL('./site-design.css', import.meta.url), 'utf8');
const HOME_DESIGN_STYLES = readFileSync(new URL('./home-design.css', import.meta.url), 'utf8');
// Read the saved theme before painting; all interactive behavior lives in site-shell.js.
const THEME_TOGGLE_SCRIPT = `<script>(function(){var root=document.documentElement;root.classList.add("js");var theme="light";try{if(window.localStorage.getItem("kriegspiel-theme")==="dark")theme="dark";}catch{}root.setAttribute("data-theme",theme);})();</script><script src="/site-shell.js?v=${PACKAGE_VERSION}" defer></script>`;
const ATTRIBUTION_SCRIPT = `<script src="/attribution.js?v=${PACKAGE_VERSION}" defer></script>`;
const TIER_FEATURE_TABLE_SCRIPT = `<script>(function(){function syncStickyTop(){var siteHeader=document.querySelector(".site-header");var height=siteHeader?Math.ceil(siteHeader.getBoundingClientRect().height):0;document.documentElement.style.setProperty("--tier-feature-sticky-top",height+"px");}function initTierFeatureTables(){syncStickyTop();document.querySelectorAll("[data-tier-feature-table]").forEach(function(root){var header=root.querySelector("[data-tier-feature-table-header]");var body=root.querySelector("[data-tier-feature-table-body]");if(!header||!body)return;var sync=function(){header.scrollLeft=body.scrollLeft;};body.addEventListener("scroll",sync,{passive:true});sync();});window.addEventListener("resize",syncStickyTop,{passive:true});}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initTierFeatureTables,{once:true});}else{initTierFeatureTables();}})();</script>`;
const FEN_BOARD_SCRIPT = `<script src="/fen-board.js?v=${PACKAGE_VERSION}" defer></script>`;


function parseFooterEntry(footerEntry) {
  const groups = [];
  let current = null;
  for (const rawLine of String(footerEntry?.body || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^#\s+(.+)$/);
    if (heading) {
      current = { title: heading[1].trim(), links: [] };
      groups.push(current);
      continue;
    }
    const link = line.match(/^-\s+\[(.+?)\]\((.+?)\)$/);
    if (link && current) current.links.push([link[2], link[1]]);
  }
  return groups;
}

function isExternalFooterHref(href = '') {
  return /^https?:\/\//.test(String(href));
}

function renderFooterLink([href, label]) {
  const external = isExternalFooterHref(href);
  const className = external ? 'footer__link footer__link--external' : 'footer__link';
  const attrs = [
    `class="${className}"`,
    `href="${esc(href)}"`,
    external ? 'target="_blank"' : '',
    external ? 'rel="noreferrer noopener"' : ''
  ].filter(Boolean).join(' ');
  return `<a ${attrs}>${esc(label)}</a>`;
}

function renderFooter(footerEntry) {
  const fallbackGroups = [
    { title: 'Game', links: [[APP_PLAY_URL, 'Play online'], ['/playing', 'Playing guide'], ['/subscription', 'Subscription'], ['/leaderboard', 'Leaderboard']] },
    { title: 'Rules', links: [['/rules/berkeley', 'Berkeley'], ['/rules/cincinnati', 'Cincinnati'], ['/rules/wild16', 'Wild 16'], ['/rules/rand', 'RAND'], ['/rules/english', 'English'], ['/rules/crazykrieg', 'CrazyKrieg'], ['/rules/comparison/', 'Comparison']] },
    { title: 'Communication', links: [['/blog', 'Blog'], ['/changelog', 'Changelog'], ['/feed.xml', 'RSS'], ['/about', 'About']] },
    { title: 'Development', links: [['https://api.kriegspiel.org/docs', 'API docs'], ['https://github.com/Kriegspiel', 'GitHub']] },
    { title: 'Social', links: [['https://x.com/kriegspiel_org', 'X.com (@kriegspiel_org)']] }
  ];
  const groups = withFeedFooterLink(footerEntry ? parseFooterEntry(footerEntry) : fallbackGroups);
  return `<div class="footer__meta"><div><a class="footer__brand" href="/">Kriegspiel.org</a><span>Hidden-information chess with referee semantics, modernized for the web.</span></div></div><div class="footer__grid">${groups.map(({ title, links }) => `<section class="footer__group" aria-label="${esc(title)}"><h2>${esc(title)}</h2><ul>${links.map((link) => `<li>${renderFooterLink(link)}</li>`).join('')}</ul></section>`).join('')}</div>`;
}

function withFeedFooterLink(groups = []) {
  const cloned = groups.map((group) => ({ title: group.title, links: Array.isArray(group.links) ? [...group.links] : [] }));
  const communication = cloned.find((group) => String(group.title).toLowerCase() === 'communication');
  if (!communication) {
    cloned.push({ title: 'Communication', links: [['/blog', 'Blog'], ['/changelog', 'Changelog'], ['/feed.xml', 'RSS'], ['/about', 'About']] });
    return cloned;
  }

  const existingFeedLink = communication.links.find(([href]) => href === '/feed.xml') || ['/feed.xml', 'RSS'];
  const linksWithoutFeed = communication.links.filter(([href]) => href !== '/feed.xml');
  const aboutIndex = linksWithoutFeed.findIndex(([href, label]) => href === '/about' || (href === '/' && label === 'About'));
  linksWithoutFeed.splice(aboutIndex === -1 ? linksWithoutFeed.length : aboutIndex, 0, existingFeedLink);
  communication.links = linksWithoutFeed;
  return cloned;
}

function metaTags({ title, description, canonicalPath, ogType = 'website' }) {
  const canonical = absUrl(canonicalPath || '/');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${esc(`${FEED_TITLE} RSS`)}" href="${esc(RSS_FEED_URL)}" />`,
    `<link rel="alternate" type="application/atom+xml" title="${esc(`${FEED_TITLE} Atom`)}" href="${esc(ATOM_FEED_URL)}" />`,
    `<meta property="og:type" content="${esc(ogType)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="Kriegspiel.org" />`,
    `<meta property="og:image" content="${esc(SOCIAL_CARD_URL)}" />`,
    `<meta property="og:image:secure_url" content="${esc(SOCIAL_CARD_URL)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(SOCIAL_CARD_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@kriegspiel_org" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(SOCIAL_CARD_URL)}" />`,
    `<meta name="twitter:image:alt" content="${esc(SOCIAL_CARD_ALT)}" />`
  ].join('');
}

function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data)}</script>`; }
function sectionsFromBody(body = '', limit = 4) { return body.split(/\r?\n\r?\n/).filter(Boolean).filter((block) => /^#/.test(block.trim())).slice(0, limit).map((block) => esc(block.split(/\r?\n/)[0].replace(/^#+\s*/, ''))); }
function prettyRuleLabel(slug = '') {
  if (slug === 'wild16') return 'Wild 16';
  if (slug === 'rand') return 'RAND';
  if (slug === 'crazykrieg') return 'CrazyKrieg';
  if (slug === 'cincinnati') return 'Cincinnati';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
function statOrZero(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function formatDateLabel(value) { if (!value) return 'Unknown'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? esc(value) : esc(parsed.toLocaleDateString()); }
function dateTimeAttribute(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value || '') : parsed.toISOString().slice(0, 10); }
function formatUtcTimestamp(value) {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return esc(value);
  return esc(parsed.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'));
}
function buildEloSeries(games = []) {
  return [...games]
    .filter((game) => Number.isFinite(Number(game?.elo_after)))
    .sort((left, right) => Date.parse(left?.played_at ?? '') - Date.parse(right?.played_at ?? ''))
    .map((game, index) => ({
      index,
      label: game?.played_at ? new Date(game.played_at).toLocaleDateString() : `Game ${index + 1}`,
      elo: Number(game.elo_after),
      delta: Number(game?.elo_delta ?? 0)
    }));
}
function buildChartPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return { polyline: '', circles: [] };
  const width = 320;
  const height = 112;
  const paddingX = 12;
  const paddingY = 12;
  const minElo = Math.min(...points.map((point) => point.elo));
  const maxElo = Math.max(...points.map((point) => point.elo));
  const eloRange = Math.max(1, maxElo - minElo);
  const xStep = points.length === 1 ? 0 : (width - paddingX * 2) / (points.length - 1);
  const circles = points.map((point, index) => {
    const x = paddingX + (xStep * index);
    const y = height - paddingY - (((point.elo - minElo) / eloRange) * (height - paddingY * 2));
    return { ...point, x, y };
  });
  return { polyline: circles.map((point) => `${point.x},${point.y}`).join(' '), circles };
}
function renderStatsGrid(stats = {}) {
  const gamesPlayed = statOrZero(stats.games_played);
  const gamesWon = statOrZero(stats.games_won);
  const gamesLost = statOrZero(stats.games_lost);
  const gamesDrawn = statOrZero(stats.games_drawn);
  const rate = (value) => `${gamesPlayed > 0 ? ((value / gamesPlayed) * 100).toFixed(1) : '0.0'}%`;
  const items = [
    ['Elo', statOrZero(stats.elo)],
    ['Peak Elo', statOrZero(stats.elo_peak)],
    ['Games', gamesPlayed],
    ['Wins', `${gamesWon} (${rate(gamesWon)})`],
    ['Losses', `${gamesLost} (${rate(gamesLost)})`],
    ['Draws', `${gamesDrawn} (${rate(gamesDrawn)})`]
  ];
  return `<dl class="hero-card__stats">${items.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}

export function renderShell({ title, description, main, activeNav = '/', canonicalPath = '/', structuredData = null, ogType = 'website', footerEntry = null, pageClass = '' }) {
  const playHref = APP_PLAY_URL;
  const nav = [['/rules', 'Rules'], ['/leaderboard', 'Leaderboard'], ['/blog', 'Blog'], [playHref, 'Play']];
  const navHtml = nav.map(([href, label]) => {
    const playClass = href === playHref ? ' site-header__play' : '';
    return `<a class="site-nav__link${playClass}" href="${href}" ${activeNav === href ? 'aria-current="page"' : ''}>${label}${href === playHref ? ' <span aria-hidden="true">↗</span>' : ''}</a>`;
  }).join('');
  const footer = renderFooter(footerEntry);
  const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Kriegspiel.org', url: SITE_URL };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#fafcfe" /><link rel="icon" href="https://kriegspiel.org/favicon.ico?v=ks-org-20260330" sizes="any" /><link rel="shortcut icon" href="https://kriegspiel.org/favicon.ico?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="32x32" href="https://kriegspiel.org/favicon-32x32.png?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="16x16" href="https://kriegspiel.org/favicon-16x16.png?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="192x192" href="https://kriegspiel.org/favicon-192.png?v=ks-org-20260330" /><link rel="apple-touch-icon" sizes="180x180" href="https://kriegspiel.org/apple-touch-icon.png?v=ks-org-20260330" /><link rel="manifest" href="https://kriegspiel.org/site.webmanifest?v=ks-org-20260330" />${metaTags({ title, description, canonicalPath, ogType })}<style>${baseStyles()}${footerExternalLinkStyles()}${proseTableOverflowStyles()}${tierFeatureMatrixStyles()}${fenDiagramStyles()}${fenInteractionStyles()}${fenPointerDragStyles()}${solutionBlockStyles()}${pageClass === 'page-shell--home' ? HOME_DESIGN_STYLES : ''}</style>${THEME_TOGGLE_SCRIPT}${ATTRIBUTION_SCRIPT}${TIER_FEATURE_TABLE_SCRIPT}${FEN_BOARD_SCRIPT}${pageClass === 'page-shell--home' ? `<script src="/home-board.js?v=${PACKAGE_VERSION}" defer></script>` : ''}${jsonLd(siteLd)}${structuredData ? jsonLd(structuredData) : ''}</head><body><header class="site-header"><div class="site-header__inner"><div class="site-branding"><button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to dark theme"><img class="theme-toggle__logo" src="/logo-theme-toggle-96.webp" width="96" height="96" alt="" draggable="false" /></button><a class="site-brand" href="/" aria-label="Kriegspiel home">Kriegspiel</a></div><nav class="site-nav" id="site-navigation" aria-label="Primary">${navHtml}</nav><button class="site-menu" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-navigation">Menu</button></div></header><main><div class="page-shell${pageClass ? ` ${esc(pageClass)}` : ''}">${main}</div></main><footer class="site-footer"><div class="site-footer__inner">${footer}</div></footer></body></html>`;
}

export function renderHomePage({ homeContent, footerEntry }) {
  const content = homeContent?.metadata || homeContent || {};
  return renderShell({
    footerEntry,
    title: 'Kriegspiel — Home',
    description: content.summary || 'Play hidden-information chess online with trusted referee semantics.',
    activeNav: '/',
    canonicalPath: '/',
    pageClass: 'page-shell--home',
    main: renderHomeDesign(content),
  });
}

export function renderLeaderboardPage(entries = [], footerEntry = null, generatedAt = new Date().toISOString()) {
  const sorted = sortEntries(entries.filter((entry) => !entry.isBot), 'rating', 'desc');
  const rows = sorted.map((entry, i) => {
    const playerCell = esc(entry.label || entry.handle);
    return `<tr><td>${i + 1}</td><td>${playerCell}</td><td>${entry.rating}</td><td>${entry.gamesPlayed}</td></tr>`;
  }).join('');
  const updatedAtLabel = formatUtcTimestamp(generatedAt);
  return renderShell({ footerEntry, title: 'Kriegspiel — Leaderboard', description: 'Top human players by overall rating.', activeNav: '/leaderboard', canonicalPath: '/leaderboard', main: `<section class="content-section"><div class="section-heading"><h1>Leaderboard</h1><p>Top human players by overall rating, refreshed hourly into a static snapshot.</p></div><div class="table-wrap"><table id="leaderboard-table" class="leaderboard-table"><caption>Top human players by overall rating</caption><thead><tr><th>Rank</th><th>Player</th><th>Overall rating</th><th>Games</th></tr></thead><tbody>${rows}</tbody></table></div><p class="page-meta-stamp">More detailed and more recent leaderboard: <a class="text-link" href="https://app.kriegspiel.org/leaderboard">app.kriegspiel.org/leaderboard</a></p><p class="page-meta-stamp">Static snapshot updated ${updatedAtLabel}</p></section>` });
}

export function renderPublicProfilePage({ profile, games = [], footerEntry = null }) {
  const stats = profile?.stats || {};
  const eloSeries = buildEloSeries(games);
  const eloChart = buildChartPoints(eloSeries);
  const roleLabel = profile?.is_bot ? 'Bot' : 'Player';
  const displayName = profile?.display_name || profile?.username || 'Unknown player';
  const bio = profile?.profile?.bio ? `<p>${esc(profile.profile.bio)}</p>` : '';
  const chart = eloSeries.length > 0
    ? `<section class="content-section"><div class="section-heading"><h2>Elo rating</h2><p>Rating history from completed games.</p></div><article class="surface-card"><svg viewBox="0 0 320 112" role="img" aria-label="Elo rating over time" style="width:100%;max-width:32rem;height:auto;display:block"><polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${esc(eloChart.polyline)}"></polyline>${eloChart.circles.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="currentColor"><title>${esc(`${point.label}: ${point.elo}${point.delta ? ` (${point.delta > 0 ? '+' : ''}${point.delta})` : ''}`)}</title></circle>`).join('')}</svg><div style="display:flex;justify-content:space-between;gap:1rem;margin-top:.85rem"><span>Start ${esc(eloSeries[0].elo)}</span><span>Latest ${esc(eloSeries[eloSeries.length - 1].elo)}</span></div></article></section>`
    : `<section class="content-section"><div class="section-heading"><h2>Elo rating</h2><p>No completed games with rating history yet.</p></div></section>`;
  return renderShell({
    footerEntry,
    title: `Kriegspiel — ${displayName}`,
    description: `${roleLabel} profile for ${displayName}.`,
    canonicalPath: `/players/${profile?.username || ''}`,
    ogType: 'profile',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': profile?.is_bot ? 'SoftwareApplication' : 'Person',
        name: displayName,
        identifier: profile?.username || '',
      },
      url: absUrl(`/players/${profile?.username || ''}`)
    },
    main: `<section class="content-section"><article class="hero-card"><p class="hero-card__eyebrow">${esc(roleLabel)}</p><h1>${esc(displayName)}</h1><p>${profile?.is_bot ? `Bot profile for @${esc(profile?.username || '')}.` : `Player profile for @${esc(profile?.username || '')}.`}</p><p>Member since ${formatDateLabel(profile?.member_since)}</p>${bio}${renderStatsGrid(stats)}</article></section>${chart}<section class="content-section"><p><a class="text-link" href="/leaderboard">Back to leaderboard</a></p></section>`
  });
}

export function renderBlogIndex(entries, footerEntry = null) {
  const items = entries.map((entry) => `<li class="surface-card"><a href="/blog/${esc(entry.metadata.slug)}">${esc(entry.metadata.title)}</a> <small><time datetime="${esc(dateTimeAttribute(entry.metadata.publishedAt))}">${esc(entry.metadata.publishedAt)}</time> • ${esc(entry.metadata.author || 'Kriegspiel Team')} • ${readingTimeLabel(entry.body)}</small><p>${esc(entry.metadata.summary)}</p></li>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Blog', description: 'Notes and updates about Kriegspiel.', activeNav: '/blog', canonicalPath: '/blog', main: `<section class="content-section"><div class="section-heading"><h1>Blog</h1><p>Notes and updates about Kriegspiel.</p></div><ul class="stack-list">${items}</ul><p><a class="text-link" href="/blog/archive">Browse archive</a> · <a class="text-link" href="/feed.xml">RSS feed</a></p></section>` });
}

export const renderBlogDetail = (entry, footerEntry = null) => renderShell({
  footerEntry,
  title: `Kriegspiel — ${entry.metadata.title}`,
  description: entry.metadata.summary,
  activeNav: '/blog',
  canonicalPath: `/blog/${entry.metadata.slug}`,
  ogType: 'article',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.metadata.title,
    description: entry.metadata.summary,
    datePublished: entry.metadata.publishedAt,
    dateModified: entry.metadata.updatedAt,
    author: { '@type': 'Organization', name: entry.metadata.author || 'Kriegspiel Team' },
    image: SOCIAL_CARD_URL,
    mainEntityOfPage: absUrl(`/blog/${entry.metadata.slug}`)
  },
  main: `<article class="prose-card"><h1>${esc(entry.metadata.title)}</h1>${renderBlogEntryMeta(entry)}${renderTagList(entry.metadata.tags)}<div class="article-summary"><p>${esc(entry.metadata.summary)}</p></div>${entry.bodyHtml}<p><a class="text-link" href="/blog">Back to blog</a></p></article>`
});

function readingTimeLabel(text) {
  const minutes = readingTimeMinutes(text);
  return `${minutes} ${minutes === 1 ? 'min' : 'mins'} read`;
}

function renderBlogEntryMeta(entry) {
  const published = `<time datetime="${esc(dateTimeAttribute(entry.metadata.publishedAt))}">${esc(entry.metadata.publishedAt)}</time>`;
  const updated = entry.metadata.updatedAt && entry.metadata.updatedAt !== entry.metadata.publishedAt
    ? `<span>Updated <time datetime="${esc(dateTimeAttribute(entry.metadata.updatedAt))}">${esc(entry.metadata.updatedAt)}</time></span>`
    : '';
  const parts = [
    `<span>By ${esc(entry.metadata.author || 'Kriegspiel Team')}</span>`,
    `<span>${published}</span>`,
    `<span>${readingTimeLabel(entry.body)}</span>`,
    updated,
  ].filter(Boolean).join('');
  return `<p class="article-meta"><small>${parts}</small></p>`;
}

function renderTagList(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  return `<ul class="article-tags" aria-label="Tags">${tags.map((tag) => `<li><span class="article-tag">${esc(tag)}</span></li>`).join('')}</ul>`;
}

export function renderBlogArchive(entries, footerEntry = null) {
  const groups = new Map();
  for (const entry of entries) { const year = String(entry.metadata.publishedAt).slice(0, 4); if (!groups.has(year)) groups.set(year, []); groups.get(year).push(entry); }
  const html = Array.from(groups.entries()).map(([year, posts]) => `<section class="content-section"><h2>${year}</h2><ul class="stack-list">${posts.map((post) => `<li class="surface-card"><a href="/blog/${post.metadata.slug}">${post.metadata.title}</a></li>`).join('')}</ul></section>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Blog Archive', description: 'Archive of all blog posts.', activeNav: '/blog', canonicalPath: '/blog/archive', main: `<section class="content-section"><div class="section-heading"><h1>Blog archive</h1></div>${html}</section>` });
}

export function renderChangelogIndex(entries, footerEntry = null) {
  const items = entries.map((entry) => `<li class="surface-card"><a href="/changelog/${entry.metadata.slug}">${entry.metadata.version} — ${entry.metadata.title}</a> <small>${entry.metadata.publishedAt}</small><p>${entry.metadata.summary}</p></li>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Changelog', description: 'Versioned release history and public change notes.', activeNav: '/changelog', canonicalPath: '/changelog', main: `<section class="content-section"><div class="section-heading"><h1>Changelog</h1><p>Versioned release history.</p></div><ul class="stack-list">${items}</ul></section>` });
}

export const renderChangelogDetail = (entry, footerEntry = null) => renderShell({ footerEntry, title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: '/changelog', canonicalPath: `/changelog/${entry.metadata.slug}`, ogType: 'article', structuredData: { '@context': 'https://schema.org', '@type': 'Article', headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { '@type': 'Organization', name: entry.metadata.author }, mainEntityOfPage: absUrl(`/changelog/${entry.metadata.slug}`) }, main: `<article class="prose-card"><h1>${entry.metadata.title}</h1><p><small>Version ${entry.metadata.version} • ${entry.metadata.publishedAt}</small></p><p>${entry.metadata.summary}</p>${entry.bodyHtml}<p><a class="text-link" href="/changelog">Back to changelog</a></p></article>` });

export function renderRulesPage(entries, changelogEntries, footerEntry = null) {
  const ruleNotes = {
    berkeley: {
      summary: 'Classic referee-led Kriegspiel with clean announcements, standard hidden-information play, and the Berkeley + Any extension.',
      status: 'Implemented online'
    },
    cincinnati: {
      summary: 'Historical public rules centered on legal tries, Illegal vs Nonsense, official own pieces, and public pawn-capture notices.',
      status: 'Implemented online'
    },
    wild16: {
      summary: 'Different capture announcements and a built-in pawn-tries rule. Read it alongside Berkeley if you want the shared game flow with the Wild 16-specific calls.',
      status: 'Implemented online'
    },
    rand: {
      summary: 'Historical RAND reference from J. D. Williams, including pawn-try squares, typed captures, promotion announcements, and rebuff counts.',
      status: 'Implemented online'
    },
    english: {
      summary: 'Gambit Club English rules with three boards, umpire-controlled legality, capture-square announcements, explicit en-passant notices, directional checks, and the classic Any? question.',
      status: 'Implemented online'
    },
    crazykrieg: {
      summary: 'Crazyhouse mixed with Kriegspiel: hidden board, public reserves, typed captures, and secret drop squares.',
      status: 'Implemented online'
    },
    dutch: {
      summary: 'Historical composition note for the Dutch capture convention, where a capture may identify whether the capturing man was a pawn or a piece.',
      status: 'Historical reference: not playable online yet'
    }
  };
  const cards = ['berkeley', 'cincinnati', 'wild16', 'rand', 'english', 'crazykrieg', 'dutch']
    .map((slug) => entries.find((entry) => entry.metadata.slug === slug))
    .filter(Boolean)
    .map((entry) => {
    const note = ruleNotes[entry.metadata.slug] || { summary: entry.metadata.summary, status: '' };
    return `<article class="surface-card rules-tile"><p class="rules-tile__eyebrow">Ruleset</p><h2>${prettyRuleLabel(entry.metadata.slug)}</h2><p>${esc(note.summary)}</p><ul class="rules-tile__meta"><li>${esc(note.status)}</li></ul><div class="rules-tile__actions"><a class="button-link button-link--primary" href="/rules/${entry.metadata.slug}">Read ${prettyRuleLabel(entry.metadata.slug)}</a></div></article>`;
  }).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Rules', description: 'Published rulesets and a quick comparison guide.', activeNav: '/rules', canonicalPath: '/rules', structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Kriegspiel Rules', url: absUrl('/rules') }, main: `<section class="content-section"><div class="section-heading"><h1>Rules</h1><p>Playable online: Berkeley, Berkeley + Any, Cincinnati, Wild 16, RAND, English, and CrazyKrieg. Historical and composition references are marked separately.</p></div><div class="feature-grid feature-grid--three rules-grid">${cards}</div><aside class="cta-panel rules-comparison-callout"><div><h2>Need the differences first?</h2><p>See the overall comparison before picking a ruleset.</p></div><div class="cta-panel__actions"><a class="button-link button-link--secondary" href="/rules/comparison/">Open rules comparison</a></div></aside></section>` });
}

export function renderRuleDetailPage(entry, changelogEntries, footerEntry = null) {
  return renderShell({ footerEntry, title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: '/rules', canonicalPath: `/rules/${entry.metadata.slug}`, structuredData: { '@context': 'https://schema.org', '@type': 'TechArticle', headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { '@type': 'Organization', name: entry.metadata.author }, mainEntityOfPage: absUrl(`/rules/${entry.metadata.slug}`) }, main: `<section class="content-section"><article class="prose-card"><h1>${esc(entry.metadata.title)}</h1>${entry.bodyHtml}</article></section>` });
}

export function renderRulesComparisonPage(entries, footerEntry = null) {
  const publicIllegalResponse = '“Illegal” or “No” means the try is illegal on the true board; “Nonsense” means it was impossible on your own board or repeated.';
  const enPassantCaptureAnnouncement = 'En passant is announced like a regular capture, using the square from which the pawn is removed.';
  const englishEnPassantCaptureAnnouncement = 'En passant is announced explicitly as en passant, using the capturing pawn’s landing square.';
  const captureSquareOnly = `After a legal capture, the captured square is announced to both players. ${enPassantCaptureAnnouncement}`;
  const captureSquareAndType = `${captureSquareOnly} The referee also says whether the captured material was a pawn or a piece.`;
  const directionalChecks = 'File, rank, long diagonal, short diagonal, knight, and double checks are announced.';
  const silentPromotion = 'Promotion is not announced and should be handled silently.';
  const englishCaptureAnnouncement = `A capture is announced with the capture square, calculated from the captured player’s side. ${englishEnPassantCaptureAnnouncement} The referee still does not generally name the capturing man or captured man.`;
  const englishCheckAnnouncement = 'Long, short, rank, file, knight, and double checks are announced.';
  const englishAnyQuestion = 'A player may ask whether any pawn capture exists. If the answer is “Yes”, the player must try one pawn capture; if that try is illegal, the player may make any legal move.';
  const crazyKriegCaptureAnnouncement = `After a legal capture, the captured square and reserve identity are announced to both players. ${enPassantCaptureAnnouncement} Promoted pawns are announced as pawns because they enter reserve as pawns.`;
  const dutchNotFullySourced = 'Not fully sourced in the currently available references.';
  const dutchCaptureAnnouncement = 'The known Dutch note identifies the capture square and whether the capturing man was a pawn or a piece. It does not identify the exact non-pawn piece in the documented example.';
  const dutchAnyQuestion = 'The documented Swart problem is framed in an “Are there any?” context, but no complete source has yet settled whether the capture-type announcement applies generally or only in problem-specific contexts.';
  const noReservesOrDrops = 'No reserves or drops; play uses only the normal pieces on the board.';
  const crazyKriegReservesAndDrops = 'Captured units change color and enter public reserves. A player may spend a turn dropping a reserve unit onto an empty square; the drop square is not announced.';
  const comparisonRows = [
    ['Referee response to illegal tries', publicIllegalResponse, publicIllegalResponse, 'Illegal attempts are private: only the mover sees “Illegal move”, and the opponent hears nothing until a move is complete.', publicIllegalResponse, publicIllegalResponse, publicIllegalResponse, dutchNotFullySourced],
    ['Capture announcements', captureSquareOnly, captureSquareAndType, captureSquareAndType, captureSquareAndType, englishCaptureAnnouncement, crazyKriegCaptureAnnouncement, dutchCaptureAnnouncement],
    ['Check announcements', directionalChecks, directionalChecks, directionalChecks, directionalChecks, englishCheckAnnouncement, directionalChecks, dutchNotFullySourced],
    ['Pawn-capture handling — “Any?” rule handling', 'No built-in “Any?” rule in the original ruleset. A compatible modification is documented: the player may ask, and if the answer is “yes”, then must do a pawn capture.', 'Before each ply starts, the referee publicly announces that the player has a pawn capture whenever at least one legal pawn capture exists. The player may now try to make captures with their pawns, or may not.', 'Before each ply starts, the referee publicly announces the number of legal capturing pawn moves. The player may now try to make captures with their pawns, or may not.', 'Before moving, the referee announces the squares on which the mover’s pawns have currently valid capture tries.', englishAnyQuestion, englishAnyQuestion, dutchAnyQuestion],
    ['Promotion announcements', silentPromotion, silentPromotion, silentPromotion, 'The fact that a pawn promotes is announced, but not the promoted piece type or promotion square.', silentPromotion, 'Promotion is not announced. If the promoted pawn is later captured, it enters reserve and is announced as a pawn.', dutchNotFullySourced],
    ['Reserves and drops', noReservesOrDrops, noReservesOrDrops, noReservesOrDrops, noReservesOrDrops, noReservesOrDrops, crazyKriegReservesAndDrops, dutchNotFullySourced],
    ['Best fit', 'Best fit if you want the Berkeley reference rules and the Berkeley-based online play model used on this site.', 'Best fit if you want the historical Cincinnati article and its public try-based referee workflow.', 'Best fit if you want the ICC-style public announcement model with counted pawn tries and no public illegal-move call.', 'Best fit if you want the 1950 RAND historical reference, especially its spectator/referee culture and more information-rich pawn-try announcements.', 'Best fit if you want the 1933 English Gambit Club rules with simple capture-square notices, explicit en-passant notices, and a classic Yes/No pawn-capture question.', 'Best fit if you want Crazyhouse reserves and drops inside a Kriegspiel hidden-board/referee model.', 'Best fit if you are reading or composing historical problems that rely on distinguishing pawn-made captures from piece-made captures.']
  ].map(([label, berkeley, cincinnati, wild16, rand, english, crazykrieg, dutch]) => `<tr><th scope="row">${label}</th><td>${berkeley}</td><td>${cincinnati}</td><td>${wild16}</td><td>${rand}</td><td>${english}</td><td>${crazykrieg}</td><td>${dutch}</td></tr>`).join('');
  const fullRulesButtonGridStyles = '<style>.rules-comparison-callout__actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;}.rules-comparison-callout__actions .button-link{width:100%;min-width:0;}@media (max-width:900px){.rules-comparison-callout__actions{grid-template-columns:repeat(2,minmax(0,1fr));}}@media (max-width:700px){.rules-comparison-callout__actions{grid-template-columns:1fr;}}</style>';
  return renderShell({ footerEntry, title: 'Kriegspiel — Rules Comparison', description: 'Quick comparison between the published Berkeley, Cincinnati, Wild 16, RAND, English, CrazyKrieg, and Dutch rulesets.', activeNav: '/rules', canonicalPath: '/rules/comparison/', structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Kriegspiel Rules Comparison', url: absUrl('/rules/comparison/') }, main: `${fullRulesButtonGridStyles}<section class="content-section"><div class="section-heading"><h1>Rules comparison</h1><p>A quick side-by-side before you dive into the full rule text.</p></div><div class="table-wrap"><table class="rules-comparison-table"><caption>Published ruleset comparison</caption><thead><tr><th>Topic</th><th><a class="text-link" href="/rules/berkeley">Berkeley</a></th><th><a class="text-link" href="/rules/cincinnati">Cincinnati</a></th><th><a class="text-link" href="/rules/wild16">Wild 16</a></th><th><a class="text-link" href="/rules/rand">RAND</a></th><th><a class="text-link" href="/rules/english">English</a></th><th><a class="text-link" href="/rules/crazykrieg">CrazyKrieg</a></th><th><a class="text-link" href="/rules/dutch">Dutch</a></th></tr></thead><tbody>${comparisonRows}</tbody></table></div><aside class="cta-panel rules-comparison-callout"><div><h2>Read the full rules</h2><p>Use the detailed rules pages when you want the complete wording and examples.</p></div><div class="cta-panel__actions rules-comparison-callout__actions"><a class="button-link button-link--secondary" href="/rules/berkeley">Berkeley rules</a><a class="button-link button-link--secondary" href="/rules/cincinnati">Cincinnati rules</a><a class="button-link button-link--secondary" href="/rules/wild16">Wild 16 rules</a><a class="button-link button-link--secondary" href="/rules/rand">RAND rules</a><a class="button-link button-link--secondary" href="/rules/english">English rules</a><a class="button-link button-link--secondary" href="/rules/crazykrieg">CrazyKrieg rules</a><a class="button-link button-link--secondary" href="/rules/dutch">Dutch rules</a></div></aside></section>` });
}

const PUBLIC_SUBSCRIPTION_TIERS = [
  { code: 'T0', name: 'Guest', price: 'Free' },
  { code: 'T1', name: 'Casual', price: 'Free' },
  { code: 'T2', name: 'Club', price: { monthly: '$10/mo', yearly: '$100/yr' } },
  { code: 'T3', name: 'Strong', price: { monthly: '$20/mo', yearly: '$200/yr' } },
  { code: 'T4', name: 'Expert', price: { monthly: '$50/mo', yearly: '$500/yr' } },
  { code: 'T5', name: 'Master', price: 'Not available yet', future: true },
  { code: 'T6', name: 'Elite', price: 'Not available yet', future: true },
];
const PUBLIC_SUBSCRIPTION_LOWER_TIER_NOTE = { type: 'note', text: 'Lower-tier bots included.' };
const PUBLIC_SUBSCRIPTION_T0_BOTS = [
  ['T0-level bots', [['Random Bot', '/user/randobot'], ['Random Any', '/user/randobotany']]],
];
const PUBLIC_SUBSCRIPTION_T1_BOTS = [
  ['T1-level bots', [['Darkboard MCTS', '/user/darkboardmcts'], ['Simple Heuristics Bot', '/user/simpleheuristics'], ['Stockfish Wild 16', '/user/stockfishwild']]],
];
const PUBLIC_SUBSCRIPTION_T2_BOTS = [
  ['T2 OpenAI', [['GPTNano', '/user/llm_gptnano'], ['GPT-OSS', '/user/llm_gptoss120b']]],
  ['T2 Anthropic', [['Claude Haiku', '/user/llm_haiku']]],
  ['T2 DeepSeek', [['V4 Flash', '/user/llm_deepseekv4_flash'], ['V3.2', '/user/llm_deepseek_v32']]],
  ['T2 Llama', [['4 Maverick', '/user/llm_llama4_maverick']]],
  ['T2 Mistral', [['Small 3.2', '/user/llm_mistral_small32']]],
  ['T2 Gemma', [['4 31B', '/user/llm_gemma4_31b']]],
  ['T2 GLM', [['4.7 Flash', '/user/llm_glm47_flash'], ['4.5 Air', '/user/llm_glm45_air']]],
  ['T2 Nemotron', [['Super', '/user/llm_nemotron_super']]],
  ['T2 Qwen', [['Plus', '/user/llm_qwen_plus'], ['3.7 Plus', '/user/llm_qwen37_plus']]],
  ['T2 MiniMax', [['M3', '/user/llm_minimax_m3']]],
  ['T2 Kimi', [['K2.5', '/user/llm_kimi_k25']]],
  ['T2 Hermes', [['4 70B', '/user/llm_hermes4_70b']]],
  ['T2 Phi', [['4', '/user/llm_phi4']]],
];
const PUBLIC_SUBSCRIPTION_T3_BOTS = [
  ['T3 OpenAI', [['GPT-5.6 Luna', '/user/llm_gpt56_luna']]],
  ['T3 Anthropic', ['Claude Sonnet 5']],
  ['T3 Gemini', [['3.1 Flash-Lite', '/user/llm_gemini31_lite'], ['3.5 Flash', '/user/llm_gemini35_flash']]],
  ['T3 Mistral', [['Large 3', '/user/llm_mistral_large3'], ['Medium 3.5', '/user/llm_mistral_medium35']]],
  ['T3 Nemotron', [['Ultra', '/user/llm_nemotron_ultra']]],
  ['T3 Qwen', [['3.6 Flash', '/user/llm_qwen36_flash']]],
  ['T3 Kimi', ['K2 Thinking']],
  ['T3 Hermes', ['3 70B']],
];
const PUBLIC_SUBSCRIPTION_T4_BOTS = [
  ['T4 Anthropic', [['Claude Opus 4.8', '/user/llm_opus48']]],
  ['T4 OpenAI', [['GPT-5.6 Terra', '/user/llm_gpt56_terra']]],
  ['T4 DeepSeek', [['V4 Pro', '/user/bot_deepseekv4_pro']]],
  ['T4 Gemini', [['3.1 Pro Preview', '/user/llm_gemini31_pro_preview']]],
  ['T4 GLM', [['5.2', '/user/llm_glm52']]],
  ['T4 Kimi', [['K2.7 Code', '/user/llm_kimi_k27_code']]],
  ['T4 Hermes', [['4 405B', '/user/llm_hermes4_405b']]],
];
const PUBLIC_SUBSCRIPTION_T5_BOTS = [
  ['T5 OpenAI', [['GPT-5.6 Sol', '/user/llm_gpt56_sol'], ['GPT-5.5', '/user/llm_gpt55'], 'GPT-5.5 Pro']],
  ['T5 xAI', [['Grok 4.5', '/user/llm_grok45']]],
  ['T5 Qwen', ['3.7 Max']],
];
function publicSubscriptionWithLowerTierBots(groups) { return [PUBLIC_SUBSCRIPTION_LOWER_TIER_NOTE, ...groups]; }
const PUBLIC_SUBSCRIPTION_PLAY_BOTS_BY_TIER = [
  PUBLIC_SUBSCRIPTION_T0_BOTS,
  publicSubscriptionWithLowerTierBots(PUBLIC_SUBSCRIPTION_T1_BOTS),
  publicSubscriptionWithLowerTierBots(PUBLIC_SUBSCRIPTION_T2_BOTS),
  publicSubscriptionWithLowerTierBots(PUBLIC_SUBSCRIPTION_T3_BOTS),
  publicSubscriptionWithLowerTierBots(PUBLIC_SUBSCRIPTION_T4_BOTS),
  publicSubscriptionWithLowerTierBots(PUBLIC_SUBSCRIPTION_T5_BOTS),
  publicSubscriptionWithLowerTierBots([]),
];
const PUBLIC_SUBSCRIPTION_FEATURES = [
  { name: 'Play human games', values: ['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'] },
  { name: 'Completed-game review', values: ['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'] },
  { name: 'Rating history', values: ['Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'] },
  { name: 'Play bots', values: PUBLIC_SUBSCRIPTION_PLAY_BOTS_BY_TIER },
  { name: 'Persistent player name', values: ['No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'] },
];

function renderSubscriptionPrice(price) {
  if (typeof price === 'string') return `<span class="tier-feature-table__detail">${esc(price)}</span>`;
  return `<span class="tier-feature-table__detail subscription-tier-price subscription-tier-price--stacked"><span>${esc(price.monthly)}</span><span>${esc(price.yearly)}</span></span>`;
}

function renderSubscriptionBotItem(item, index, items) {
  const label = Array.isArray(item) ? item[0] : item;
  const href = Array.isArray(item) ? item[1] : '';
  const labelHtml = href ? `<a href="${esc(appUrl(href))}">${esc(label)}</a>` : esc(label);
  return `<li>${labelHtml}${index < items.length - 1 ? ';' : ''}</li>`;
}

function renderSubscriptionBotList(groups = []) {
  return `<div class="subscription-bot-list">${groups.map((group) => {
    if (group?.type === 'note') return `<p class="subscription-bot-list__note">${esc(group.text)}</p>`;
    const [label, items = []] = group;
    return `<div class="subscription-bot-list__group"><strong>${esc(label)}:</strong><ul>${items.map((item, index) => renderSubscriptionBotItem(item, index, items)).join('')}</ul></div>`;
  }).join('')}</div>`;
}

function renderSubscriptionFeatureValue(value) {
  if (Array.isArray(value)) return renderSubscriptionBotList(value);
  const marker = String(value).toLowerCase() === 'yes' ? 'yes' : 'no';
  return `<span class="tier-feature-table__mark tier-feature-table__mark--${marker}">${esc(value)}</span>`;
}

export function renderSubscriptionPage(footerEntry = null) {
  const colgroup = `<col class="tier-feature-table__feature-col" />${PUBLIC_SUBSCRIPTION_TIERS.map(() => '<col class="tier-feature-table__tier-col" />').join('')}`;
  const headerCells = PUBLIC_SUBSCRIPTION_TIERS.map((tier) => {
    const futureClass = tier.future ? ' tier-feature-table__tier-column--unavailable subscription-tier-column--future' : '';
    return `<th class="tier-feature-table__tier-col${futureClass}" scope="col"><span class="tier-feature-table__heading"><span class="tier-feature-table__tier-prefix">Tier</span><span class="tier-feature-table__number tier-feature-table__number--${esc(tier.code.toLowerCase())}">${esc(tier.code)}</span><span class="tier-feature-table__name">${esc(tier.name)}</span>${renderSubscriptionPrice(tier.price)}</span></th>`;
  }).join('');
  const bodyRows = PUBLIC_SUBSCRIPTION_FEATURES.map((feature) => {
    const cells = feature.values.map((value, index) => {
      const tier = PUBLIC_SUBSCRIPTION_TIERS[index];
      const futureClass = tier?.future ? ' subscription-tier-column--future' : '';
      const textClass = Array.isArray(value) ? ' tier-feature-table__cell-text' : '';
      return `<td class="tier-feature-table__tier-col${futureClass}${textClass}">${renderSubscriptionFeatureValue(value)}</td>`;
    }).join('');
    return `<tr><th class="tier-feature-table__feature-col" scope="row">${esc(feature.name)}</th>${cells}</tr>`;
  }).join('');
  return renderShell({
    footerEntry,
    title: 'Kriegspiel — Subscription',
    description: 'Kriegspiel levels, free play, and optional subscriptions.',
    activeNav: '/subscription',
    canonicalPath: '/subscription',
    structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Kriegspiel Subscription', url: absUrl('/subscription') },
    main: `<style>${subscriptionPublicStyles()}</style><section class="content-section content-section--wide subscription-public-page"><div class="section-heading subscription-public-heading"><h1>Subscription</h1><p>Start free, play the core game, and graduate to stronger bot tiers whenever you want more challenge.</p></div><aside class="subscription-public-invite" aria-label="Start free"><div><p class="subscription-public-invite__eyebrow">Free level first</p><h2>Create a profile and start playing.</h2><p>The free Casual level already includes human games, completed-game review, rating history, and simple bots. Paid tiers are optional upgrades for stronger bots and project support.</p></div><div class="subscription-public-invite__actions"><a class="button-link button-link--primary" href="${esc(appUrl('/auth/register'))}">Create free profile</a><a class="button-link button-link--secondary" href="${esc(APP_PLAY_URL)}">Start playing</a></div></aside><article class="prose-card prose-card--wide subscription-tier-card" aria-labelledby="subscription-tier-table-title"><h2 id="subscription-tier-table-title">Kriegspiel levels</h2><div class="tier-feature-table-wrap subscription-tier-table-wrap" data-tier-feature-table style="--tier-feature-tier-count:${PUBLIC_SUBSCRIPTION_TIERS.length};"><div class="tier-feature-table__frozen-header" data-tier-feature-table-header><table class="tier-feature-table tier-feature-table--header subscription-tier-table"><colgroup>${colgroup}</colgroup><thead><tr><th class="tier-feature-table__feature-col" scope="col">Feature</th>${headerCells}</tr></thead></table></div><div class="tier-feature-table__body-scroll" data-tier-feature-table-body><table class="tier-feature-table tier-feature-table--body subscription-tier-table"><colgroup>${colgroup}</colgroup><tbody>${bodyRows}</tbody></table></div></div></article><section class="subscription-support-note" aria-labelledby="subscription-support-note-title"><h2 id="subscription-support-note-title">Why subscriptions help</h2><p>Kriegspiel.org is built so everyone can enjoy the full experience and pleasure of the game without needing a paid plan. The free T1 level covers almost everything most players need to play, review, and keep improving.</p><p>Paid tiers exist because stronger bots use paid AI tokens, and they bring more challenge, variety, and joy to the game. A subscription helps cover those costs while supporting the project and keeping Kriegspiel welcoming for everyone.</p></section></section>`
  });
}

export function renderRedirectPage({ fromPath, toPath, title = 'Redirecting…', footerEntry = null }) {
  return renderShell({ footerEntry, title: `Kriegspiel — ${title}`, description: `Redirecting from ${fromPath} to ${toPath}.`, canonicalPath: toPath, main: `<section class="content-section"><article class="prose-card"><h1>${title}</h1><p>This page moved to <a class="text-link" href="${toPath}">${toPath}</a>.</p></article></section>` }).replace('</head>', `<meta http-equiv="refresh" content="0; url=${toPath}" /></head>`);
}

export function renderSiteMarkdownPage(entry, footerEntry = null) {
  const isAbout = entry.metadata.slug === 'about';
  const versionStamp = isAbout ? `<p class="page-meta-stamp page-meta-stamp--version">Version ${esc(PACKAGE_VERSION)}</p>` : '';
  return renderShell({
    footerEntry,
    title: `Kriegspiel — ${entry.metadata.title}`,
    description: entry.metadata.summary,
    canonicalPath: `/${entry.metadata.slug}`,
    pageClass: isAbout ? 'page-shell--about' : '',
    main: `<section class="content-section"><article class="prose-card"><h1>${esc(entry.metadata.title)}</h1>${entry.bodyHtml}</article>${versionStamp}</section>`
  });
}

export const renderSimplePage = (title, footerEntry = null) => renderShell({ footerEntry, title: `Kriegspiel — ${title}`, description: `${title} page`, canonicalPath: '/404', main: `<section class="content-section"><article class="prose-card"><h1>${title}</h1><p>Generated by ks-home build.</p></article></section>` });

function subscriptionPublicStyles() {
  return [
    `.subscription-public-page{display:grid;gap:1rem;}`,
    `.subscription-public-heading{margin-bottom:0;}`,
    `.subscription-public-invite{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:1rem;padding:1.2rem 1.3rem;border:1px solid rgba(121,82,0,.35);border-radius:var(--radius);background:linear-gradient(180deg,#fff3b0,#f7d66b);box-shadow:var(--shadow-soft);}`,
    `.subscription-public-invite h2{margin-bottom:.35rem;color:#1f170f;}`,
    `.subscription-public-invite p{color:#3e2b13;}`,
    `.subscription-public-invite__eyebrow{margin:0 0 .35rem;font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#5a3e11;}`,
    `.subscription-public-invite__actions{display:flex;flex-wrap:wrap;gap:.65rem;justify-content:flex-end;}`,
    `.subscription-public-invite .button-link--primary{background:#1e1611;border-color:#1e1611;color:#fff;}`,
    `.subscription-public-invite .button-link--secondary{background:rgba(255,248,240,.7);border-color:rgba(85,58,34,.3);color:#1e1611;}`,
    `.subscription-tier-card{display:grid;gap:1rem;}`,
    `.subscription-tier-card h2{margin:0;}`,
    `.subscription-tier-table-wrap{margin-top:0;}`,
    `.subscription-tier-table-wrap .tier-feature-table{min-width:60rem;}`,
    `.subscription-tier-table-wrap .tier-feature-table__feature-col{width:9.5rem;}`,
    `.subscription-tier-table-wrap .tier-feature-table__tier-col{width:calc((100% - 9.5rem) / var(--tier-feature-tier-count,7));}`,
    `.prose-card .subscription-tier-table-wrap .tier-feature-table--header thead th:first-child,.prose-card .subscription-tier-table-wrap .tier-feature-table__body-scroll .tier-feature-table tbody th:first-child,.prose-card .subscription-tier-table-wrap .tier-feature-table__body-scroll .tier-feature-table tbody td:first-child{width:9.5rem;min-width:9.5rem;}`,
    `.subscription-tier-table .tier-feature-table__heading{min-height:7.2rem;}`,
    `.subscription-tier-table .tier-feature-table__feature-col{text-align:left;}`,
    `.subscription-tier-price--stacked{display:grid;gap:.08rem;}`,
    `.subscription-tier-column--future{background:color-mix(in srgb,var(--surface-alt) 84%,#8a8580);}`,
    `.subscription-bot-list{display:grid;gap:.5rem;font-size:.84rem;line-height:1.35;}`,
    `.subscription-bot-list__note{margin:0;font-weight:800;color:var(--text);}`,
    `.subscription-bot-list__group{display:grid;gap:.12rem;}`,
    `.subscription-bot-list__group strong{font-weight:800;}`,
    `.subscription-bot-list ul{display:grid;gap:.05rem;margin:0;padding:0;list-style:none;}`,
    `.subscription-bot-list li{margin:0;color:var(--muted);}`,
    `.subscription-bot-list a{font-weight:700;text-decoration-thickness:1px;text-underline-offset:.16em;}`,
    `.subscription-support-note{padding:1.2rem 1.3rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow-soft);}`,
    `.subscription-support-note h2{font-size:1.05rem;margin:0 0 .55rem;letter-spacing:0;}`,
    `.subscription-support-note p{max-width:72rem;}`,
    `html[data-theme="dark"] .subscription-public-invite{background:linear-gradient(180deg,#5b430b,#3a2a08);border-color:rgba(247,214,107,.55);}`,
    `html[data-theme="dark"] .subscription-public-invite h2,html[data-theme="dark"] .subscription-public-invite p,html[data-theme="dark"] .subscription-public-invite__eyebrow{color:#fff4c2;}`,
    `html[data-theme="dark"] .subscription-public-invite .button-link--primary{background:#f4ede4;border-color:#f4ede4;color:#100d0a;}`,
    `html[data-theme="dark"] .subscription-public-invite .button-link--secondary{background:rgba(28,23,18,.82);border-color:rgba(244,237,228,.28);color:#f4ede4;}`,
    `@media (max-width:900px){.subscription-public-invite{grid-template-columns:1fr;}.subscription-public-invite__actions{justify-content:flex-start;}.subscription-tier-table-wrap .tier-feature-table{min-width:54rem;}.subscription-tier-table-wrap .tier-feature-table__feature-col{width:8.5rem;}.subscription-tier-table-wrap .tier-feature-table__tier-col{width:calc((100% - 8.5rem) / var(--tier-feature-tier-count,7));}.prose-card .subscription-tier-table-wrap .tier-feature-table--header thead th:first-child,.prose-card .subscription-tier-table-wrap .tier-feature-table__body-scroll .tier-feature-table tbody th:first-child,.prose-card .subscription-tier-table-wrap .tier-feature-table__body-scroll .tier-feature-table tbody td:first-child{width:8.5rem;min-width:8.5rem;}.subscription-tier-table .tier-feature-table__heading{min-height:6.6rem;}}`
  ].join('');
}

function proseTableOverflowStyles() { return `.prose-card .table-wrap code{white-space:normal;overflow-wrap:anywhere;word-break:break-word;}@media (min-width:701px){.prose-card .table-wrap th:first-child,.prose-card .table-wrap td:first-child{width:26%;min-width:12rem;}}`; }

function tierFeatureMatrixStyles() {
  return [
    `.content-section--wide{width:100%;}`,
    `.prose-card--wide{width:100%;}`,
    `@media (min-width:1180px){.content-section--wide{width:min(92vw,96rem);margin-left:50%;transform:translateX(-50%);}.prose-card--wide{padding:1.55rem 1.6rem;}}`,
    `.tier-feature-table-wrap{overflow:visible;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-soft);isolation:isolate;position:relative;}`,
    `.tier-feature-table__frozen-header{position:sticky;top:var(--tier-feature-sticky-top,0px);z-index:9;overflow:hidden;border-radius:var(--radius) var(--radius) 0 0;background:color-mix(in srgb,var(--surface-alt) 88%,var(--accent-soft));border-bottom:1px solid var(--border);}`,
    `.tier-feature-table__body-scroll{overflow-x:auto;overflow-y:visible;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;border-radius:0 0 var(--radius) var(--radius);}`,
    `.tier-feature-table-wrap .tier-feature-table{width:100%;min-width:86rem;table-layout:fixed;border:0;border-radius:0;border-collapse:separate;border-spacing:0;overflow:visible;}`,
    `.tier-feature-table__feature-col{width:14rem;}`,
    `.tier-feature-table__tier-col{width:calc((100% - 14rem) / var(--tier-feature-tier-count,7));}`,
    `.tier-feature-table--header{background:transparent;}`,
    `.tier-feature-table--body{border-top:0;}`,
    `.tier-feature-table--header thead th{vertical-align:top;text-align:center;padding:.9rem .65rem;background:color-mix(in srgb,var(--surface-alt) 88%,var(--accent-soft));box-shadow:0 1px 0 var(--border);}`,
    `.prose-card .tier-feature-table-wrap .tier-feature-table--header thead th:first-child{position:sticky;left:0;z-index:2;width:14rem;min-width:14rem;text-align:left;background:color-mix(in srgb,var(--surface-alt) 88%,var(--accent-soft));box-shadow:1px 0 0 var(--border),0 1px 0 var(--border);}`,
    `.prose-card .tier-feature-table__body-scroll .tier-feature-table tbody th:first-child,.prose-card .tier-feature-table__body-scroll .tier-feature-table tbody td:first-child{width:14rem;min-width:14rem;position:sticky;left:0;z-index:3;background:var(--surface-strong);box-shadow:1px 0 0 var(--border);}`,
    `.tier-feature-table tbody th{font-weight:700;line-height:1.25;}`,
    `.tier-feature-table tbody td{text-align:center;vertical-align:middle;}`,
    `.tier-feature-table tbody td.tier-feature-table__cell-text{text-align:left;vertical-align:top;font-size:.84rem;font-weight:600;line-height:1.38;}`,
    `.tier-feature-table tbody td.tier-feature-table__cell-text a{font-weight:800;}`,
    `.tier-feature-table__heading{display:grid;justify-items:center;gap:.26rem;min-height:6.2rem;align-content:center;}`,
    `.tier-feature-table__tier-label{display:grid;justify-items:center;align-content:center;gap:.22rem;width:100%;min-height:3.3rem;}`,
    `.tier-feature-table__tier-prefix{display:block;font-size:.82rem;font-weight:800;line-height:1.2;text-align:center;color:var(--text);}`,
    `.tier-feature-table__number{--tier-badge-bg:#2a231d;--tier-badge-corner:#8c725e;position:relative;display:inline-flex;align-items:center;justify-content:center;width:2rem;min-width:2rem;height:2rem;padding:0;border-radius:0;border:1px solid rgba(255,248,240,.18);overflow:hidden;background:var(--tier-badge-bg);color:#f4ede4;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);font-size:.75rem;font-weight:800;line-height:1;}`,
    `.tier-feature-table__number::before{content:"";position:absolute;top:0;right:0;width:.92rem;height:.92rem;background:var(--tier-badge-corner);clip-path:polygon(100% 0,0 0,100% 100%);pointer-events:none;}`,
    `.tier-feature-table__number--t0{--tier-badge-bg:#2a231d;--tier-badge-corner:#8c725e;}`,
    `.tier-feature-table__number--t1{--tier-badge-bg:#4a3325;--tier-badge-corner:#d38555;}`,
    `.tier-feature-table__number--t2{--tier-badge-bg:#5a4a1f;--tier-badge-corner:#d8bb45;}`,
    `.tier-feature-table__number--t3{--tier-badge-bg:#31553f;--tier-badge-corner:#7bd995;}`,
    `.tier-feature-table__number--t4{--tier-badge-bg:#255660;--tier-badge-corner:#67d9ec;}`,
    `.tier-feature-table__number--t5{--tier-badge-bg:#2f4772;--tier-badge-corner:#86a8ff;}`,
    `.tier-feature-table__number--t6{--tier-badge-bg:#56345d;--tier-badge-corner:#d88fe8;}`,
    `html[data-theme="dark"] .tier-feature-table__number{border-color:rgba(255,248,240,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1px rgba(0,0,0,.28);}`,
    `.tier-feature-table__name{font-size:1.02rem;font-weight:800;line-height:1.1;color:var(--text);}`,
    `.tier-feature-table__detail{max-width:100%;font-size:.78rem;font-weight:800;line-height:1.15;color:var(--muted-soft);overflow-wrap:anywhere;}`,
    `.tier-feature-table th.tier-feature-table__tier-column--unavailable,.tier-feature-table td.tier-feature-table__tier-column--unavailable{background:color-mix(in srgb,var(--surface-alt) 86%,#8a8580);color:var(--muted-soft);}`,
    `.tier-feature-table--header thead th.tier-feature-table__tier-column--unavailable{background:color-mix(in srgb,var(--surface-alt) 72%,#8a8580);}`,
    `.tier-feature-table__tier-column--unavailable .tier-feature-table__heading{opacity:.58;}`,
    `.tier-feature-table__tier-column--unavailable .tier-feature-table__number{--tier-badge-bg:#6f6a64;--tier-badge-corner:#c8bfb4;background:var(--tier-badge-bg);color:#f4ede4;}`,
    `.tier-feature-table__tier-column--unavailable .tier-feature-table__tier-prefix,.tier-feature-table__tier-column--unavailable .tier-feature-table__name,.tier-feature-table__tier-column--unavailable .tier-feature-table__detail{color:var(--muted-soft);}`,
    `.tier-feature-table tbody td.tier-feature-table__tier-column--unavailable{font-size:1.3rem;font-weight:800;line-height:1;color:var(--muted-soft);}`,
    `.tier-feature-table tbody td.tier-feature-table__tier-column--unavailable.tier-feature-table__cell-text{font-size:.84rem;font-weight:600;line-height:1.38;color:var(--muted-soft);}`,
    `.tier-feature-table__mark{display:inline-flex;align-items:center;justify-content:center;min-width:3.6rem;min-height:1.9rem;padding:.2rem .65rem;border-radius:999px;font-weight:800;line-height:1.2;}`,
    `.tier-feature-table__mark--yes{background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);}`,
    `.tier-feature-table__mark--no{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);}`,
    `@media (max-width:700px){.tier-feature-table__feature-col{width:11rem;}.tier-feature-table__tier-col{width:calc((100% - 11rem) / var(--tier-feature-tier-count,7));}.prose-card .tier-feature-table-wrap .tier-feature-table--header thead th:first-child,.prose-card .tier-feature-table__body-scroll .tier-feature-table tbody th:first-child,.prose-card .tier-feature-table__body-scroll .tier-feature-table tbody td:first-child{width:11rem;min-width:11rem;}.tier-feature-table-wrap .tier-feature-table{min-width:72rem;}}`
  ].join('');
}

function fenDiagramStyles() { return `.fen-diagram{margin:1.25rem 0 1.55rem;display:grid;gap:.55rem;justify-items:start;}.fen-board{width:22rem;max-width:100%;user-select:none;-webkit-user-select:none;color-scheme:light;}.fen-board__grid{position:relative;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));width:100%;aspect-ratio:1/1;padding:0;gap:0;border:1px solid var(--ks-board-edge);border-radius:0;overflow:hidden;background:var(--ks-square-light);box-shadow:none;touch-action:none;}.fen-board__square{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;width:100%;height:100%;}.fen-board__square--light{background:var(--ks-square-light);}.fen-board__square--dark{background:var(--ks-square-dark);}.fen-board__piece{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;width:85%;height:85%;padding:0;}.fen-board__piece-image{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;}.fen-board__coord{position:absolute;z-index:4;font-size:11px;font-weight:500;letter-spacing:0;color:var(--ks-board-muted);pointer-events:none;line-height:1;}.fen-board__coord--file{right:4px;bottom:3px;}.fen-board__coord--rank{left:4px;top:4px;}.fen-diagram__caption{display:grid;gap:.25rem;max-width:min(100%,36rem);font-size:.86rem;line-height:1.45;color:var(--muted-soft);}.fen-diagram__caption code{overflow-wrap:anywhere;word-break:break-word;}.fen-diagram__side{font-size:.75rem;font-weight:800;letter-spacing:0;text-transform:uppercase;color:var(--text);}@media (max-width:640px){.fen-board{width:30rem;max-width:100%;}}@media (max-width:480px){.fen-board__piece:not(.fen-board__piece--phantom){width:78%;height:78%;}.fen-board__coord{font-size:10px;}.fen-board__coord--file{right:2px;bottom:2px;}}`; }

function fenInteractionStyles() { return `.fen-diagram{position:relative;}.fen-diagram__workspace{display:flex;align-items:flex-start;gap:.55rem;flex-wrap:wrap;}.fen-board{flex:0 1 auto;min-width:0;}.fen-board__grid .fen-board__square{--square-hover-overlay:transparent;--square-capture-overlay:transparent;--square-ring-highlight:inset 0 0 0 0 rgba(0,0,0,0);--square-ring-last-move:inset 0 0 0 0 rgba(0,0,0,0);--square-ring-capture:inset 0 0 0 0 rgba(0,0,0,0);--square-ring-illegal:inset 0 0 0 0 rgba(0,0,0,0);--square-ring-suggested:inset 0 0 0 0 rgba(0,0,0,0);position:relative;display:flex;align-items:center;justify-content:center;appearance:none;-webkit-appearance:none;border:none;border-radius:0;margin:0;padding:0;min-width:0;min-height:0;width:100%;height:100%;background:transparent;box-shadow:none;font:inherit;font-weight:400;color:inherit;outline:none;outline-offset:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;transition:filter .12s ease;}.fen-board__grid .fen-board__square::before{content:"";position:absolute;inset:.18rem;border-radius:.18rem;background:linear-gradient(0deg,var(--square-hover-overlay),var(--square-hover-overlay)),linear-gradient(0deg,var(--square-capture-overlay),var(--square-capture-overlay));opacity:1;pointer-events:none;z-index:0;transition:background .12s ease;}.fen-board__grid .fen-board__square::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:4;box-shadow:var(--square-ring-highlight),var(--square-ring-last-move),var(--square-ring-capture),var(--square-ring-illegal),var(--square-ring-suggested);transition:box-shadow .12s ease;}.fen-board__grid .fen-board__square:hover,.fen-board__grid .fen-board__square:focus-visible,.fen-board__grid .fen-board__square:active{border-color:transparent;transform:none;outline:none;filter:none;}.fen-board__grid .fen-board__square:hover::before,.fen-board__grid .fen-board__square:focus-visible::before,.fen-board__grid .fen-board__square:active::before{opacity:1;}.fen-board__grid .fen-board__square:focus-visible{--square-ring-highlight:inset 0 0 0 2px var(--ks-board-muted);}.fen-board__grid .square.light{background:var(--ks-square-light);}.fen-board__grid .square.dark{background:var(--ks-square-dark);}.fen-board__grid .square.light:hover,.fen-board__grid .square.light:focus-visible,.fen-board__grid .square.light:active{--square-hover-overlay:rgba(82,101,118,.1);}.fen-board__grid .square.dark:hover,.fen-board__grid .square.dark:focus-visible,.fen-board__grid .square.dark:active{--square-hover-overlay:rgba(82,101,118,.1);}.fen-board__grid .fen-board__square:disabled{cursor:not-allowed;}.fen-board__square.square--highlighted,.fen-board__square[data-fen-selected="true"]{--square-ring-highlight:inset 0 0 0 .24rem var(--ks-board-muted);}.fen-board__grid .fen-board__square.square--last-move,.fen-board__grid .fen-board__square[data-fen-last-move="true"]{background:var(--ks-highlight);}.fen-board__square.square--capture{--square-capture-overlay:rgba(185,28,28,.34);--square-ring-capture:inset 0 0 0 .18rem rgba(185,28,28,.74);}.fen-board__square.square--illegal{--square-ring-illegal:inset 0 0 0 .22rem rgba(220,38,38,.95);}.fen-board__square.square--suggested,.fen-board__square[data-fen-drag-over="true"]{--square-ring-suggested:inset 0 0 0 .16rem rgba(34,197,94,.78);}.fen-board__piece{cursor:grab;}.fen-board__piece:active{cursor:grabbing;}.fen-board__piece--phantom{position:absolute;z-index:1;width:min(76%,3.55rem);height:min(76%,3.55rem);padding:0;opacity:.62;filter:saturate(.68) contrast(.92);pointer-events:auto;}.fen-board__square.square--phantom .phantom-piece-on-board::after{content:"";position:absolute;inset:14%;border-radius:1rem;background:rgba(86,156,255,.08);box-shadow:inset 0 0 0 1px rgba(86,156,255,.18);pointer-events:none;}.fen-board-tools{flex:0 0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.32rem;align-content:start;padding-top:.1rem;}.fen-board-tools .fen-board-tools__button{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:8px 12px;border-radius:2px;background:var(--surface);border:1px solid var(--border-strong);color:var(--text);font-size:14px;line-height:1;white-space:nowrap;}.fen-board-tools .fen-board-tools__reset{grid-column:1/-1;}.fen-board-tools .fen-board-tools__button:hover,.fen-board-tools .fen-board-tools__button:focus-visible{background:var(--accent-soft);border-color:var(--border-strong);color:var(--text);}.fen-board-tools .fen-board-tools__button:disabled{opacity:.46;cursor:not-allowed;background:var(--surface);color:var(--muted-soft);}.fen-board-tools .fen-board-tools__button:disabled:hover,.fen-board-tools .fen-board-tools__button:disabled:focus-visible{background:var(--surface);border-color:var(--border-strong);color:var(--muted-soft);}.fen-phantom-menu{position:fixed;z-index:100;width:min(10.25rem,calc(100vw - 1rem));min-width:9.5rem;padding:.42rem;border-radius:2px;border:1px solid var(--border-strong);background:var(--surface);box-shadow:none;}.fen-phantom-menu[hidden]{display:none;}.fen-phantom-menu__piece-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.32rem;}.fen-phantom-menu .fen-phantom-menu__piece-button{position:relative;display:grid;place-items:center;width:100%;min-width:44px;min-height:44px;padding:.28rem;border-radius:2px;background:var(--surface);border:1px solid var(--border-strong);color:var(--text);}.fen-phantom-menu .fen-phantom-menu__piece-button:hover,.fen-phantom-menu .fen-phantom-menu__piece-button:focus-visible{background:var(--accent-soft);border-color:var(--border-strong);color:var(--text);}.fen-phantom-menu__piece-symbol{display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;opacity:.7;filter:saturate(.68) contrast(.92);}.fen-phantom-menu__piece-symbol img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;filter:drop-shadow(0 1px 0 rgba(255,255,255,.12));}@media (max-width:640px){.fen-diagram__workspace{gap:.45rem;}.fen-board{width:30rem;max-width:100%;flex:0 1 auto;}.fen-board-tools{padding-top:0;}.fen-phantom-menu{left:.5rem!important;right:.5rem;bottom:.5rem;top:auto!important;width:auto;min-width:0;}.fen-phantom-menu__piece-grid{grid-template-columns:repeat(6,minmax(0,1fr));}}@media (hover:none),(pointer:coarse){.fen-board__grid .fen-board__square,.fen-board__grid .fen-board__square::before,.fen-board__grid .fen-board__square::after,.fen-board__piece-image{transition:none;}.fen-board__grid .fen-board__square:hover .piece__image,.fen-board__grid .fen-board__square:focus-visible .piece__image{filter:none;}}`; }

function fenPointerDragStyles() { return `.fen-board__piece{touch-action:none;user-select:none;-webkit-user-select:none;}.fen-diagram[data-fen-dragging="true"] .fen-board__piece{cursor:grabbing;}.fen-board__piece[data-fen-drag-source="true"]{visibility:hidden;}.fen-board__piece.fen-drag-preview{position:fixed;left:0;top:0;z-index:9;margin:0;pointer-events:none;contain:layout paint style;will-change:transform;}`; }

function solutionBlockStyles() { return `.solution-block{margin:1rem 0 1.25rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:color-mix(in srgb,var(--surface-alt) 90%,transparent);overflow:hidden;}.solution-block summary{min-height:2.75rem;display:flex;align-items:center;gap:.5rem;padding:.7rem .95rem;font-weight:700;color:var(--text);cursor:pointer;list-style:none;}.solution-block summary::-webkit-details-marker{display:none;}.solution-block summary::before{content:"+";display:inline-flex;align-items:center;justify-content:center;width:1rem;font-size:1.15rem;line-height:1;color:var(--muted-soft);}.solution-block[open] summary::before{content:"-";}.solution-block summary:hover,.solution-block summary:focus-visible{background:var(--accent-soft);}.solution-block summary:hover::before,.solution-block summary:focus-visible::before{color:var(--text);}.solution-block summary:focus-visible{outline:2px solid var(--text);outline-offset:-2px;}.solution-block__body{display:grid;gap:.85rem;padding:.9rem .95rem 1rem;border-top:1px solid var(--border);}.solution-block__body>*{margin:0;}.solution-block__body ul,.solution-block__body ol{padding-left:1.25rem;}.solution-block[open]{background:color-mix(in srgb,var(--surface-strong) 90%,transparent);}`; }

function footerExternalLinkStyles() { return `.footer__group a.footer__link{display:inline-flex;align-items:center;}.footer__link--external{font-weight:500;}`; }


function baseStyles() { return SITE_DESIGN_STYLES; }
