import { sortEntries, trendMarker } from './leaderboard.mjs';
import { readingTimeMinutes } from './content-utils.mjs';

const SITE_URL = 'https://kriegspiel.org';

function esc(v = '') { return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function absUrl(path = '/') { return `${SITE_URL}${path}`; }
const THEME_TOGGLE_SCRIPT = `<script>(function(){var STORAGE_KEY="kriegspiel-theme";var root=document.documentElement;var mediaQuery=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;function readStoredTheme(){try{var value=window.localStorage.getItem(STORAGE_KEY);return value==="light"||value==="dark"?value:null;}catch(error){return null;}}function preferredTheme(){var stored=readStoredTheme();if(stored)return stored;return mediaQuery&&mediaQuery.matches?"dark":"light";}function applyTheme(theme){root.setAttribute("data-theme",theme);if(document.body){document.body.setAttribute("data-theme",theme);}var metaThemeColor=document.querySelector('meta[name="theme-color"]');if(metaThemeColor){metaThemeColor.setAttribute("content",theme==="dark"?"#100d0a":"#f7efe3");}var button=document.querySelector("[data-theme-toggle]");if(button){var nextTheme=theme==="dark"?"light":"dark";button.setAttribute("aria-pressed",String(theme==="dark"));button.setAttribute("aria-label","Toggle color theme");button.removeAttribute("title");button.setAttribute("data-next-theme",nextTheme);}}function storeTheme(theme){try{window.localStorage.setItem(STORAGE_KEY,theme);}catch(error){}}function toggleTheme(){var current=root.getAttribute("data-theme")||preferredTheme();var next=current==="dark"?"light":"dark";storeTheme(next);applyTheme(next);}root.setAttribute("data-theme",preferredTheme());document.addEventListener("DOMContentLoaded",function(){applyTheme(root.getAttribute("data-theme")||preferredTheme());var button=document.querySelector("[data-theme-toggle]");if(button){button.addEventListener("click",toggleTheme);}});if(mediaQuery){var onPreferenceChange=function(event){if(!readStoredTheme()){applyTheme(event.matches?"dark":"light");}};if(typeof mediaQuery.addEventListener==="function"){mediaQuery.addEventListener("change",onPreferenceChange);}else if(typeof mediaQuery.addListener==="function"){mediaQuery.addListener(onPreferenceChange);}}})();</script>`;


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

function renderFooter(footerEntry) {
  const fallbackGroups = [
    { title: 'Rules', links: [['/rules/berkeley', 'Berkeley'], ['/rules/wild16', 'Wild 16'], ['/rules/comparison/', 'Comparison']] },
    { title: 'Communication', links: [['/blog', 'Blog'], ['/changelog', 'Changelog'], ['/', 'About']] },
    { title: 'Social', links: [['https://x.com/kriegspiel_org', 'X.com (@kriegspiel_org)'], ['https://github.com/Kriegspiel', 'GitHub']] }
  ];
  const groups = footerEntry ? parseFooterEntry(footerEntry) : fallbackGroups;
  return `<div class="footer__meta"><div><a class="footer__brand" href="/">Kriegspiel.org</a><span>Hidden-information chess with referee semantics, modernized for the web.</span></div></div><div class="footer__grid">${groups.map(({ title, links }) => `<section class="footer__group" aria-label="${esc(title)}"><h2>${esc(title)}</h2><ul>${links.map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`).join('')}</ul></section>`).join('')}</div>`;
}

function metaTags({ title, description, canonicalPath, ogType = 'website' }) {
  const canonical = absUrl(canonicalPath || '/');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="${esc(ogType)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`
  ].join('');
}

function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data)}</script>`; }
function sectionsFromBody(body = '', limit = 4) { return body.split(/\r?\n\r?\n/).filter(Boolean).filter((block) => /^#/.test(block.trim())).slice(0, limit).map((block) => esc(block.split(/\r?\n/)[0].replace(/^#+\s*/, ''))); }
function prettyRuleLabel(slug = '') { return slug === 'wild16' ? 'Wild16' : slug.charAt(0).toUpperCase() + slug.slice(1); }
function statOrZero(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function formatDateLabel(value) { if (!value) return 'Unknown'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? esc(value) : esc(parsed.toLocaleDateString()); }
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

export function renderShell({ title, description, main, activeNav = '/', canonicalPath = '/', structuredData = null, ogType = 'website', footerEntry = null }) {
  const playHref = 'https://app.kriegspiel.org/';
  const nav = [['/leaderboard', 'Leaderboard'], ['/blog', 'Blog'], ['/rules', 'Rules'], [playHref, 'Play']];
  const navHtml = nav.map(([href, label]) => {
    const playClass = href === playHref ? ' site-header__play button-link button-link--primary' : '';
    return `<a class="site-nav__link${playClass}" href="${href}" ${activeNav === href ? 'aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  const footer = renderFooter(footerEntry);
  const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Kriegspiel.org', url: SITE_URL };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#f7efe3" /><link rel="icon" href="https://kriegspiel.org/favicon.ico?v=ks-org-20260330" sizes="any" /><link rel="shortcut icon" href="https://kriegspiel.org/favicon.ico?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="32x32" href="https://kriegspiel.org/favicon-32x32.png?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="16x16" href="https://kriegspiel.org/favicon-16x16.png?v=ks-org-20260330" /><link rel="icon" type="image/png" sizes="192x192" href="https://kriegspiel.org/favicon-192.png?v=ks-org-20260330" /><link rel="apple-touch-icon" sizes="180x180" href="https://kriegspiel.org/apple-touch-icon.png?v=ks-org-20260330" /><link rel="manifest" href="https://kriegspiel.org/site.webmanifest?v=ks-org-20260330" />${metaTags({ title, description, canonicalPath, ogType })}<style>${baseStyles()}</style>${THEME_TOGGLE_SCRIPT}${jsonLd(siteLd)}${structuredData ? jsonLd(structuredData) : ''}</head><body><header class="site-header"><div class="site-header__inner"><div class="site-branding"><a class="site-brand" href="/">Kriegspiel</a><button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Toggle color theme"><img class="theme-toggle__logo" src="/logo-theme-toggle.png" alt="" /></button></div><div class="site-header__actions"><nav class="site-nav" aria-label="Primary">${navHtml}</nav></div></div></header><main><div class="page-shell">${main}</div></main><footer class="site-footer"><div class="site-footer__inner">${footer}</div></footer></body></html>`;
}

export function renderHomePage({ rulesCount = 0, blogCount = 0, homeContent, footerEntry }) {
  const content = homeContent?.metadata || homeContent || {};
  const interpolate = (value = '') => String(value).replaceAll('{{rulesCount}}', String(rulesCount)).replaceAll('{{blogCount}}', String(blogCount));
  return renderShell({
    footerEntry,
    title: 'Kriegspiel — Home',
    description: content.summary || 'Play hidden-information chess online with trusted referee semantics.',
    activeNav: '/',
    canonicalPath: '/',
    main: `<section id="hero" class="hero-card"><p class="hero-card__eyebrow"${content.eyebrow ? '' : ' hidden'}>${esc(content.eyebrow)}</p><h1>${esc(content.heroTitle)}</h1><p class="hero-card__lede">${esc(content.heroLede)}</p><div class="hero-card__actions"><a class="button-link button-link--primary" href="${esc(content.heroPrimaryCtaHref)}" data-telemetry-event="home_cta_click">${esc(content.heroPrimaryCtaLabel)}</a><a class="button-link button-link--secondary" href="${esc(content.heroSecondaryCtaHref)}">${esc(content.heroSecondaryCtaLabel)}</a></div></section><section id="how-it-works" class="content-section home-section home-section--compact"><div class="section-heading"><h2>${esc(content.flowTitle)}</h2><p>${esc(content.flowIntro)}</p></div><ol class="feature-grid feature-grid--three home-list home-list--compact"><li class="surface-card home-list__card"><strong>${esc(content.flowStep1Title)}</strong><span>${esc(content.flowStep1Body)}</span></li><li class="surface-card home-list__card"><strong>${esc(content.flowStep2Title)}</strong><span>${esc(content.flowStep2Body)}</span></li><li class="surface-card home-list__card"><strong>${esc(content.flowStep3Title)}</strong><span>${esc(content.flowStep3Body)}</span></li></ol></section><section id="cta" class="content-section home-section home-section--compact"><div class="cta-panel"><div class="section-heading"><h2>${esc(content.ctaTitle)}</h2><p>${esc(content.ctaBody)}</p></div><div class="cta-panel__actions"><a class="button-link button-link--primary" href="${esc(content.ctaPrimaryHref)}">${esc(content.ctaPrimaryLabel)}</a><a class="button-link button-link--secondary" href="${esc(content.ctaSecondaryHref)}">${esc(content.ctaSecondaryLabel)}</a></div></div></section>`
  });
}

export function renderLeaderboardPage(entries = [], footerEntry = null, generatedAt = new Date().toISOString()) {
  const sorted = sortEntries(entries, 'rating', 'desc');
  const rows = sorted.map((entry, i) => {
    const label = entry.label || entry.handle;
    const badge = entry.isBot ? ' <small>(bot)</small>' : '';
    const playerCell = entry.profilePath
      ? `<a href="${esc(entry.profilePath)}">${esc(label)}</a>${badge}`
      : `${esc(label)}${badge}`;
    return `<tr><td>${i + 1}</td><td>${playerCell}</td><td>${entry.rating}</td><td>${entry.gamesPlayed}</td><td aria-label="trend">${trendMarker(entry.trend)}</td></tr>`;
  }).join('');
  const updatedAtLabel = formatUtcTimestamp(generatedAt);
  return renderShell({ footerEntry, title: 'Kriegspiel — Leaderboard', description: 'Top active players and listed bots by rating and activity.', activeNav: '/leaderboard', canonicalPath: '/leaderboard', main: `<section class="content-section"><div class="section-heading"><h1>Leaderboard</h1><p>Top active players and listed bots, refreshed hourly from the ranking API into a static snapshot.</p></div><div id="stale-banner" class="status-banner" hidden role="status">Showing stale data. Refreshing…</div><div class="button-row"><button data-sort="rating" data-telemetry-event="leaderboard_sort">Sort by rating</button><button data-sort="gamesPlayed" data-telemetry-event="leaderboard_sort">Sort by games</button><button id="retry" data-telemetry-event="leaderboard_retry">Retry</button></div><div id="loading" role="status">Loading leaderboard…</div><div id="error" class="status-error" hidden role="alert">Could not load leaderboard. Try again.</div><div id="empty" hidden role="status">No ranked players yet.</div><div class="table-wrap"><table id="leaderboard-table" hidden><caption>Top players by rating</caption><thead><tr><th>Rank</th><th>Player</th><th>Rating</th><th>Games</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table></div><p class="page-meta-stamp">Static snapshot updated ${updatedAtLabel}</p></section>` });
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
  const items = entries.map((entry) => `<li class="surface-card"><a href="/blog/${entry.metadata.slug}">${entry.metadata.title}</a> <small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small><p>${entry.metadata.summary}</p></li>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Blog', description: 'Editorial updates from the Kriegspiel team.', activeNav: '/blog', canonicalPath: '/blog', main: `<section class="content-section"><div class="section-heading"><h1>Blog</h1><p>Editorial updates from the Kriegspiel team.</p></div><ul class="stack-list">${items}</ul><p><a class="text-link" href="/blog/archive">Browse archive</a></p></section>` });
}

export const renderBlogDetail = (entry, footerEntry = null) => renderShell({ footerEntry, title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: '/blog', canonicalPath: `/blog/${entry.metadata.slug}`, ogType: 'article', structuredData: { '@context': 'https://schema.org', '@type': 'Article', headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { '@type': 'Organization', name: entry.metadata.author }, mainEntityOfPage: absUrl(`/blog/${entry.metadata.slug}`) }, main: `<article class="prose-card"><h1>${entry.metadata.title}</h1><p><small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small></p><div class="article-summary"><p>${entry.metadata.summary}</p></div>${entry.bodyHtml}<p><a class="text-link" href="/blog">Back to blog</a></p></article>` });

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
  const primary = entries.filter((entry) => ['berkeley', 'wild16'].includes(entry.metadata.slug));
  const cards = primary.map((entry) => `<article class="surface-card rules-tile"><p class="rules-tile__eyebrow">Ruleset</p><h2>${prettyRuleLabel(entry.metadata.slug)}</h2><p>${esc(entry.metadata.summary)}</p><div class="rules-tile__actions"><a class="button-link button-link--primary" href="/rules/${entry.metadata.slug}">Read ${prettyRuleLabel(entry.metadata.slug)} rules</a></div></article>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Rules', description: 'Published rulesets and a quick comparison guide.', activeNav: '/rules', canonicalPath: '/rules', structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Kriegspiel Rules', url: absUrl('/rules') }, main: `<section class="content-section"><div class="section-heading"><h1>Rules</h1><p>Choose a published ruleset, then use the comparison page when you need the differences at a glance.</p></div><div class="feature-grid feature-grid--two rules-grid">${cards}</div><aside class="cta-panel rules-comparison-callout"><div><h2>Need the differences first?</h2><p>See the overall comparison before picking a ruleset.</p></div><div class="cta-panel__actions"><a class="button-link button-link--secondary" href="/rules/comparison/">Open rules comparison</a></div></aside></section>` });
}

export function renderRuleDetailPage(entry, changelogEntries, footerEntry = null) {
  return renderShell({ footerEntry, title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: '/rules', canonicalPath: `/rules/${entry.metadata.slug}`, structuredData: { '@context': 'https://schema.org', '@type': 'TechArticle', headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { '@type': 'Organization', name: entry.metadata.author }, mainEntityOfPage: absUrl(`/rules/${entry.metadata.slug}`) }, main: `<section class="content-section"><article class="prose-card"><h1>${esc(entry.metadata.title)}</h1>${entry.bodyHtml}</article></section>` });
}

export function renderRulesComparisonPage(entries, footerEntry = null) {
  const berkeley = entries.find((entry) => entry.metadata.slug === 'berkeley');
  const wild16 = entries.find((entry) => entry.metadata.slug === 'wild16');
  const comparisonRows = [
    ['Referee response to illegal tries', 'Referee says “No” for illegal moves on the true board, and “Nonsense” for impossible or repeated tries on your own board.', 'Referee says “Illegal move”; the opponent is not told anything extra.'],
    ['Capture announcements', 'Capture square is announced to both players after a legal capture.', 'Distinguishes pawn captures from other piece captures in the announcement.'],
    ['Check announcements', 'Rank, File, Short, Long, and Knight checks are announced to both players.', 'Rank, File, Long-diagonal, Short-diagonal, and Knight checks are announced.'],
    ['Any? / pawn-tries handling', 'No built-in “Any?” rule, though a compatible optional variant is documented.', 'Includes a pawn-tries announcement with the number of legal capturing pawn moves.'],
    ['Best fit', 'Closest match for the Berkeley reference material and the published site rules text.', 'Closest match for the Wild16 / ICC-style online announcement pattern.']
  ].map(([label, left, right]) => `<tr><th scope="row">${label}</th><td>${left}</td><td>${right}</td></tr>`).join('');
  return renderShell({ footerEntry, title: 'Kriegspiel — Rules Comparison', description: 'Quick comparison between the published Berkeley and Wild16 rulesets.', activeNav: '/rules', canonicalPath: '/rules/comparison/', structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Kriegspiel Rules Comparison', url: absUrl('/rules/comparison/') }, main: `<section class="content-section"><div class="section-heading"><h1>Rules comparison</h1><p>A quick side-by-side before you dive into the full rule text.</p></div><div class="feature-grid feature-grid--two"><article class="surface-card"><h2>Berkeley</h2><p>${esc(berkeley?.metadata.summary || '')}</p><p><a class="text-link" href="/rules/berkeley">Read Berkeley rules</a></p></article><article class="surface-card"><h2>Wild16</h2><p>${esc(wild16?.metadata.summary || '')}</p><p><a class="text-link" href="/rules/wild16">Read Wild16 rules</a></p></article></div><div class="table-wrap"><table><caption>Published ruleset comparison</caption><thead><tr><th>Topic</th><th>Berkeley</th><th>Wild16</th></tr></thead><tbody>${comparisonRows}</tbody></table></div></section>` });
}

export function renderRedirectPage({ fromPath, toPath, title = 'Redirecting…', footerEntry = null }) {
  return renderShell({ footerEntry, title: `Kriegspiel — ${title}`, description: `Redirecting from ${fromPath} to ${toPath}.`, canonicalPath: toPath, main: `<section class="content-section"><article class="prose-card"><h1>${title}</h1><p>This page moved to <a class="text-link" href="${toPath}">${toPath}</a>.</p></article></section>` }).replace('</head>', `<meta http-equiv="refresh" content="0; url=${toPath}" /></head>`);
}

export function renderSiteMarkdownPage(entry, footerEntry = null) {
  return renderShell({
    footerEntry,
    title: `Kriegspiel — ${entry.metadata.title}`,
    description: entry.metadata.summary,
    canonicalPath: `/${entry.metadata.slug}`,
    main: `<section class="content-section"><article class="prose-card"><h1>${esc(entry.metadata.title)}</h1>${entry.bodyHtml}</article></section>`
  });
}

export const renderSimplePage = (title, footerEntry = null) => renderShell({ footerEntry, title: `Kriegspiel — ${title}`, description: `${title} page`, canonicalPath: '/404', main: `<section class="content-section"><article class="prose-card"><h1>${title}</h1><p>Generated by ks-home build.</p></article></section>` });

function baseStyles() { return `:root{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color-scheme:light;--bg:#f7efe3;--bg-soft:#efe4d6;--surface:rgba(255,248,240,.9);--surface-strong:#fff8f0;--surface-alt:rgba(247,239,227,.92);--text:#1e1611;--muted:#553a22;--muted-soft:rgba(85,58,34,.78);--border:rgba(85,58,34,.18);--border-strong:rgba(85,58,34,.28);--accent:#1e1611;--accent-soft:rgba(85,58,34,.08);--success:#355c3f;--success-bg:rgba(106,153,120,.14);--success-border:rgba(53,92,63,.22);--danger:#8c3b32;--danger-bg:rgba(140,59,50,.12);--danger-border:rgba(140,59,50,.2);--shadow:0 20px 45px rgba(20,14,10,.14);--shadow-soft:0 10px 24px rgba(20,14,10,.08);--radius:18px;--radius-sm:12px;--page-width:72rem;--content-width:56rem;--logo-filter:drop-shadow(0 0 .65rem rgba(255,255,255,.42));--logo-opacity:.92;--toggle-bg:rgba(255,252,247,.95);}html[data-theme="dark"]{color-scheme:dark;--bg:#100d0a;--bg-soft:#16110d;--surface:rgba(28,23,18,.9);--surface-strong:#1c1712;--surface-alt:rgba(28,23,18,.94);--text:#f4ede4;--muted:rgba(244,237,228,.88);--muted-soft:rgba(244,237,228,.74);--border:rgba(244,237,228,.16);--border-strong:rgba(244,237,228,.26);--accent:#f4ede4;--accent-soft:rgba(244,237,228,.08);--success:#b7ddc0;--success-bg:rgba(106,153,120,.18);--success-border:rgba(183,221,192,.24);--danger:#efc2b8;--danger-bg:rgba(140,59,50,.22);--danger-border:rgba(239,194,184,.2);--shadow:0 24px 55px rgba(0,0,0,.38);--shadow-soft:0 10px 24px rgba(0,0,0,.28);--logo-filter:drop-shadow(0 0 .75rem rgba(0,0,0,.45)) brightness(.92) contrast(1.08);--logo-opacity:.88;--toggle-bg:#1c1712;}*{box-sizing:border-box;}html{scroll-behavior:smooth;}body{margin:0;min-width:320px;min-height:100vh;font-family:inherit;line-height:1.55;background:linear-gradient(180deg,var(--bg) 0%,var(--bg-soft) 100%);color:var(--text);transition:background-color .18s ease,color .18s ease;}body::before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,252,247,.26) 0%,rgba(0,0,0,.05) 100%);}html[data-theme="dark"] body::before{background:linear-gradient(180deg,rgba(7,6,5,.22) 0%,rgba(0,0,0,.18) 100%);}a{color:inherit;}.site-brand,.site-nav__link,.button-link,.footer__brand,.footer__group a,.footer__meta a,.stack-list a,.table-link,a[href]{cursor:pointer;}p,li,small,span{color:var(--muted);}strong,h1,h2,h3,dt,th,td,code,a,button{color:var(--text);}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}code{background:color-mix(in srgb,var(--surface-alt) 88%,transparent);padding:.12rem .35rem;border-radius:.45rem;}pre{margin:1.1rem 0 0;padding:1rem 1.1rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:color-mix(in srgb,var(--surface-alt) 96%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);overflow-x:auto;-webkit-overflow-scrolling:touch;}pre code{display:block;padding:0;background:transparent;border-radius:0;white-space:pre;line-height:1.6;color:var(--text);}pre code.hljs{background:transparent;color:var(--text);}pre code .hljs-comment,pre code .hljs-quote{color:color-mix(in srgb,var(--muted-soft) 92%,transparent);font-style:italic;}pre code .hljs-keyword,pre code .hljs-selector-tag,pre code .hljs-meta,pre code .hljs-doctag{color:#8a4f2a;}pre code .hljs-title,pre code .hljs-section,pre code .hljs-function .hljs-title,pre code .hljs-title.function_{color:#6e3f78;}pre code .hljs-string,pre code .hljs-attr,pre code .hljs-attribute,pre code .hljs-template-variable{color:#2f6f62;}pre code .hljs-number,pre code .hljs-literal,pre code .hljs-symbol,pre code .hljs-variable,pre code .hljs-bullet{color:#9a5a22;}pre code .hljs-built_in,pre code .hljs-type,pre code .hljs-class .hljs-title{color:#2d5d86;}html[data-theme="dark"] pre code .hljs-keyword,html[data-theme="dark"] pre code .hljs-selector-tag,html[data-theme="dark"] pre code .hljs-meta,html[data-theme="dark"] pre code .hljs-doctag{color:#f0b07a;}html[data-theme="dark"] pre code .hljs-title,html[data-theme="dark"] pre code .hljs-section,html[data-theme="dark"] pre code .hljs-function .hljs-title,html[data-theme="dark"] pre code .hljs-title.function_{color:#deb0ee;}html[data-theme="dark"] pre code .hljs-string,html[data-theme="dark"] pre code .hljs-attr,html[data-theme="dark"] pre code .hljs-attribute,html[data-theme="dark"] pre code .hljs-template-variable{color:#9edecf;}html[data-theme="dark"] pre code .hljs-number,html[data-theme="dark"] pre code .hljs-literal,html[data-theme="dark"] pre code .hljs-symbol,html[data-theme="dark"] pre code .hljs-variable,html[data-theme="dark"] pre code .hljs-bullet{color:#f2c27a;}html[data-theme="dark"] pre code .hljs-built_in,html[data-theme="dark"] pre code .hljs-type,html[data-theme="dark"] pre code .hljs-class .hljs-title{color:#8fc3f7;}ol li::marker{font-weight:700;color:var(--text);}h1,h2,h3{line-height:1.1;margin:0 0 .75rem;}h1{font-size:clamp(2.2rem,5vw,3.8rem);letter-spacing:-.04em;}h2{font-size:clamp(1.35rem,3vw,2rem);letter-spacing:-.03em;}h3{font-size:1.12rem;font-weight:700;}p{margin:.5rem 0 0;}ul,ol{margin:1rem 0 0;padding-left:1.25rem;}em{font-style:italic;}.prose-card h2{margin-top:2rem;}.prose-card h3{margin-top:1.35rem;}.site-header{position:sticky;top:0;z-index:10;backdrop-filter:blur(10px);background:color-mix(in srgb,var(--bg) 88%,transparent);border-bottom:1px solid var(--border);}.site-header__inner,.site-footer__inner,.page-shell{width:min(calc(100% - 2rem),var(--page-width));margin:0 auto;}.site-header__inner{padding:.9rem 0;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;}.site-branding{display:inline-flex;align-items:center;gap:.7rem;flex-wrap:wrap;min-width:0;}.site-brand{font-weight:700;font-size:1.05rem;letter-spacing:-.03em;text-decoration:none;}.theme-toggle{display:inline-flex;align-items:center;justify-content:center;width:2.75rem;min-height:2.75rem;height:2.75rem;padding:0;border-radius:999px;border:1px solid var(--border);background:var(--toggle-bg);box-shadow:0 10px 25px rgba(0,0,0,.12);cursor:default;appearance:none;-webkit-appearance:none;flex:0 0 auto;transition:none;transform:none;outline:none;}.theme-toggle:hover,.theme-toggle:focus-visible,.theme-toggle:active{background:var(--toggle-bg);border-color:var(--border);box-shadow:0 10px 25px rgba(0,0,0,.12);transform:none;outline:none;}.theme-toggle__logo{width:1.7rem;height:1.7rem;display:block;opacity:var(--logo-opacity);filter:var(--logo-filter);}.site-header__actions{display:flex;align-items:center;justify-content:flex-end;gap:.75rem;flex-wrap:wrap;min-width:0;}.site-nav{display:flex;align-items:center;justify-content:flex-end;gap:.5rem;flex-wrap:wrap;}.site-nav__link{text-decoration:none;padding:.55rem .8rem;border-radius:999px;color:var(--muted);border:1px solid transparent;background:transparent;transition:background-color .16s ease,border-color .16s ease,color .16s ease;}.site-nav__link:hover,.site-nav__link:focus-visible{color:var(--text);background:var(--accent-soft);box-shadow:none;transform:none;}.site-nav__link[aria-current="page"]{background:var(--surface-strong);border-color:var(--border);color:var(--text);box-shadow:var(--shadow-soft);}.site-nav__link.site-header__play{display:inline-flex;align-items:center;justify-content:center;min-height:2.8rem;padding:.72rem 1rem;border-radius:.85rem;border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:600;}.site-nav__link.site-header__play:hover,.site-nav__link.site-header__play:focus-visible{background:#2f241c;border-color:#2f241c;color:#fff;box-shadow:var(--shadow-soft);}html[data-theme="dark"] .site-nav__link.site-header__play{color:#100d0a;}html[data-theme="dark"] .site-nav__link.site-header__play:hover,html[data-theme="dark"] .site-nav__link.site-header__play:focus-visible{background:#e6dacd;border-color:#e6dacd;color:#100d0a;}.page-shell{padding:2.5rem 0 4rem;position:relative;}.page-shell>*:first-child{margin-top:0;}.content-section{margin-top:1.5rem;}.content-section:first-child{margin-top:0;}.home-section{padding-top:1.5rem;border-top:1px solid var(--border);}.home-section:first-of-type{padding-top:0;border-top:0;}.home-section--compact{padding-top:1.25rem;}.section-heading{max-width:42rem;margin-bottom:1rem;}.section-heading p{font-size:1.05rem;max-width:42rem;}.section-heading--centered{margin-inline:auto;text-align:center;}.hero-card,.surface-card,section>table,section>div>table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);}.prose-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-soft);}.code-snippet{margin:1.15rem 0 0;}.code-snippet figcaption{margin:0;padding:.65rem .9rem;border:1px solid var(--border);border-bottom:0;border-radius:var(--radius-sm) var(--radius-sm) 0 0;background:color-mix(in srgb,var(--accent-soft) 72%,var(--surface-strong));font-size:.88rem;font-weight:600;color:var(--text);}.code-snippet pre{margin:0;border-top-left-radius:0;border-top-right-radius:0;}.hero-card{padding:clamp(1.5rem,4vw,3rem);position:relative;overflow:hidden;background:linear-gradient(180deg,color-mix(in srgb,var(--surface-strong) 96%,transparent),color-mix(in srgb,var(--surface-alt) 94%,transparent));}.hero-card::after{content:"";position:absolute;inset:auto -4rem -5rem auto;width:16rem;height:16rem;border-radius:50%;background:radial-gradient(circle,var(--accent-soft),rgba(148,163,184,0));pointer-events:none;}.hero-card--centered{text-align:center;padding-block:clamp(2.5rem,8vw,5rem);}.hero-card{display:grid;justify-items:start;text-align:left;}.hero-card--centered>*{position:relative;z-index:1;}.hero-card__eyebrow{margin:0 0 .85rem;font-size:.85rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-soft);}.hero-card__lede{max-width:44rem;font-size:1.08rem;}.hero-card--centered .hero-card__lede{margin-inline:auto;font-size:clamp(1.08rem,2.2vw,1.3rem);max-width:36rem;}.hero-card__actions,.button-row,.cta-panel__actions,.rule-detail-actions,.rules-tile__actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.35rem;}.hero-card__actions--centered{justify-content:center;}.button-link,button:not(.theme-toggle){display:inline-flex;align-items:center;justify-content:center;min-height:2.8rem;padding:.72rem 1rem;border-radius:.85rem;border:1px solid var(--border-strong);background:var(--surface-strong);text-decoration:none;font-weight:600;cursor:pointer;transition:box-shadow .16s ease,background-color .16s ease,border-color .16s ease;}.button-link:hover,.button-link:focus-visible,button:not(.theme-toggle):hover,button:not(.theme-toggle):focus-visible{box-shadow:var(--shadow-soft);}.button-link--primary,button:not(.theme-toggle){background:var(--accent);border-color:var(--accent);color:#fff;}.button-link--primary:hover,.button-link--primary:focus-visible,button:not(.theme-toggle):hover,button:not(.theme-toggle):focus-visible{background:#2f241c;border-color:#2f241c;color:#fff;}html[data-theme="dark"] .button-link--primary,html[data-theme="dark"] button:not(.theme-toggle){color:#100d0a;}html[data-theme="dark"] .button-link--primary:hover,html[data-theme="dark"] .button-link--primary:focus-visible,html[data-theme="dark"] button:not(.theme-toggle):hover,html[data-theme="dark"] button:not(.theme-toggle):focus-visible{background:#e6dacd;border-color:#e6dacd;color:#100d0a;}.button-link--secondary{background:var(--surface-strong);color:var(--text);}.hero-card__stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:1.5rem 0 0;width:100%;align-self:stretch;}.hero-card__stats div,.surface-card{padding:1.2rem 1.25rem;border-radius:var(--radius-sm);background:var(--surface);}.hero-card__stats div{border:1px solid var(--border);background:color-mix(in srgb,var(--surface-alt) 92%,transparent);}dt{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-soft);}dd{margin:.35rem 0 0;font-size:1.45rem;font-weight:700;letter-spacing:-.03em;}.feature-grid,.stack-list{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:1rem;}.feature-grid{grid-template-columns:repeat(1,minmax(0,1fr));}.feature-grid--two{grid-template-columns:repeat(2,minmax(0,1fr));}.feature-grid--three{grid-template-columns:repeat(3,minmax(0,1fr));}.surface-card h3,.surface-card strong,.home-grid__item h3,.home-list__item strong{display:block;margin-bottom:.45rem;}.home-list__item,.home-grid__item,.cta-panel--plain{padding:0;border:0;background:transparent;box-shadow:none;border-radius:0;}.home-list__item,.home-grid__item{position:relative;padding-left:1rem;}.home-list__item::before,.home-grid__item::before{content:"";position:absolute;left:0;top:.35rem;bottom:.35rem;width:2px;background:linear-gradient(180deg,var(--border-strong),transparent);border-radius:999px;}.home-list__item span,.home-grid__item p{display:block;}.home-list--compact{margin-top:1.25rem;}.home-list__card{padding:1.1rem 1.15rem;}.home-list__card::before{display:none;}.cta-panel{display:flex;justify-content:space-between;gap:1.5rem;align-items:end;padding:1.35rem 1.4rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-soft);}.cta-panel--centered{align-items:center;flex-direction:column;text-align:center;}.cta-panel__note{margin:0;color:var(--muted-soft);font-size:.95rem;}.cta-panel--plain{padding:.25rem 0 0;align-items:start;background:transparent;border:0;box-shadow:none;}.cta-panel .section-heading,.cta-panel .section-heading p{max-width:none;}.stack-list li{list-style:none;}.text-link{font-weight:600;text-decoration:none;border-bottom:1px solid var(--border-strong);}.text-link:hover,.text-link:focus-visible{border-bottom-color:var(--text);}.prose-card{padding:1.35rem 1.4rem;}.prose-card>:first-child{margin-top:0;}.article-summary{position:relative;margin:1.35rem 0 1.6rem;padding:0 0 1.1rem;}.article-summary::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent 0%,var(--border-strong) 10%,var(--border-strong) 90%,transparent 100%);}.article-summary p{margin:0;font-size:1.06rem;color:var(--muted);}@media (max-width:700px){.article-summary{margin:1.1rem 0 1.35rem;padding-bottom:.95rem;}}.rules-tile{padding:1.4rem;min-height:100%;display:flex;flex-direction:column;justify-content:space-between;}.rules-tile__eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:.78rem;color:var(--muted-soft);margin:0 0 .85rem;}.rules-tile__meta,.rule-detail-meta{display:flex;gap:.75rem;flex-wrap:wrap;padding:0;list-style:none;}.rule-detail-meta span,.rules-tile__meta li{display:inline-flex;align-items:center;padding:.35rem .55rem;border-radius:999px;background:var(--accent-soft);color:var(--text);}.rules-comparison-callout{margin-top:1rem;}.table-wrap{overflow-x:auto;margin-top:1rem;border-radius:var(--radius);}table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}th,td{border-bottom:1px solid var(--border);padding:.8rem;text-align:left;}thead th{background:var(--surface-alt);}caption{padding:1rem;text-align:left;font-weight:700;color:var(--text);}.status-banner{margin-top:1rem;padding:.85rem 1rem;border-radius:.75rem;border:1px solid var(--success-border);background:var(--success-bg);color:var(--success);}.status-error{margin-top:1rem;padding:.85rem 1rem;border-radius:.75rem;border:1px solid var(--danger-border);background:var(--danger-bg);color:var(--danger);}.page-meta-stamp{margin:1.35rem auto 0;text-align:center;font-size:.92rem;color:var(--muted-soft);}.site-footer{border-top:1px solid var(--border);background:color-mix(in srgb,var(--bg) 92%,transparent);}.site-footer__inner{display:grid;gap:1.2rem;padding:1.5rem 0 2rem;}.footer__meta{display:grid;gap:.35rem;margin-bottom:0;}.footer__meta>div{display:grid;gap:.35rem;max-width:36rem;}.footer__brand{font-weight:700;text-decoration:none;letter-spacing:-.03em;color:var(--text);}.footer__brand:hover,.footer__brand:focus-visible{color:var(--text);}.footer__meta-link{white-space:nowrap;align-self:center;color:var(--muted);}.footer__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1.25rem;}.footer__group{padding:0;border:0;background:transparent;box-shadow:none;}.footer__group h2{font-size:.95rem;margin:0 0 .55rem;letter-spacing:normal;text-transform:none;color:var(--text);}.footer__group ul{list-style:none;padding:0;margin:0;display:grid;gap:.4rem;}.footer__group a{display:block;text-decoration:none;color:var(--muted);font-weight:400;cursor:pointer;}.footer__group a:hover,.footer__group a:focus-visible{color:var(--text);}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--text);outline-offset:2px;}@media (max-width:900px){.site-header__inner,.site-footer__inner,.page-shell{width:min(calc(100% - 1.5rem),var(--page-width));}.feature-grid--two,.feature-grid--three,.hero-card__stats,.cta-panel{grid-template-columns:1fr;display:grid;}.cta-panel,.cta-panel--plain{align-items:start;}}@media (max-width:700px){.site-header__inner{align-items:flex-start;}.site-branding,.site-header__actions{width:100%;}.site-header__actions,.site-nav{justify-content:flex-start;}.page-shell{padding-top:1.5rem;padding-bottom:3rem;}h1{font-size:clamp(2.1rem,9vw,3rem);}.hero-card,.prose-card,.surface-card,.cta-panel,.rules-tile{padding:1rem;}.footer__meta-link{white-space:normal;}table,thead,tbody,tr,th,td{display:block;}tr{border-bottom:1px solid var(--border);}th{display:none;}td{padding:.55rem .8rem;}}`; }
