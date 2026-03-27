import { sortEntries, trendMarker } from "./leaderboard.mjs";
import { readingTimeMinutes } from "./content-utils.mjs";

const SITE_URL = "https://kriegspiel.org";

function esc(v = "") { return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function absUrl(path = "/") { return `${SITE_URL}${path}`; }

function metaTags({ title, description, canonicalPath, ogType = "website" }) {
  const canonical = absUrl(canonicalPath || "/");
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
  ].join("");
}

function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data)}</script>`; }

export function renderShell({ title, description, main, activeNav = "/", canonicalPath = "/", structuredData = null, ogType = "website" }) {
  const nav = [["/", "Home"], ["/leaderboard", "Leaderboard"], ["/blog", "Blog"], ["/changelog", "Changelog"], ["/rules", "Rules"]];
  const navHtml = nav.map(([href, label]) => `<a href="${href}" ${activeNav === href ? "aria-current=\"page\"" : ""}>${label}</a>`).join(" ");
  const footer = `<small>© Kriegspiel</small> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>`;
  const siteLd = { "@context": "https://schema.org", "@type": "WebSite", name: "Kriegspiel", url: SITE_URL };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />${metaTags({ title, description, canonicalPath, ogType })}<style>${baseStyles()}</style>${jsonLd(siteLd)}${structuredData ? jsonLd(structuredData) : ""}</head><body><header><nav aria-label="Primary">${navHtml}</nav></header><main>${main}</main><footer>${footer}</footer></body></html>`;
}

export function renderHomePage({ rulesCount = 0, blogCount = 0 }) {
  return renderShell({
    title: "Kriegspiel — Home",
    description: "Play hidden-information chess online with trusted referee semantics.",
    activeNav: "/",
    canonicalPath: "/",
    main: `<section id="hero"><h1>Play hidden-information chess, properly online.</h1><p>Kriegspiel keeps uncertainty and referee semantics while making games fast and fair.</p><a href="/leaderboard" data-telemetry-event="home_cta_click">See Leaderboard</a></section><section id="how-it-works"><h2>How it works</h2><ol><li>Queue for a match.</li><li>Receive legal/no announcements.</li><li>Review game narrative.</li></ol></section><section id="key-features"><h2>Key features</h2><ul><li>Asymmetric information preserved.</li><li>Fast async-friendly play.</li><li>Variant-specific referee output.</li></ul></section><section id="cta"><h2>Ready to play?</h2><a href="/rules">Read rules</a></section><section id="trust-snippet"><h2>Trust snapshot</h2><p>${rulesCount} rulesets documented, ${blogCount} public updates shipped.</p></section>`
  });
}

export function renderLeaderboardPage(entries = []) {
  const sorted = sortEntries(entries, "rating", "desc");
  const rows = sorted.map((entry, i) => `<tr><td>${i + 1}</td><td>${entry.handle}</td><td>${entry.rating}</td><td>${entry.gamesPlayed}</td><td aria-label="trend">${trendMarker(entry.trend)}</td></tr>`).join("");
  return renderShell({ title: "Kriegspiel — Leaderboard", description: "Top active Kriegspiel players by rating and activity.", activeNav: "/leaderboard", canonicalPath: "/leaderboard", main: `<section><h1>Leaderboard</h1><p>Top active players, refreshed from ranking API.</p><div id="stale-banner" hidden role="status">Showing stale data. Refreshing…</div><div><button data-sort="rating" data-telemetry-event="leaderboard_sort">Sort by rating</button><button data-sort="gamesPlayed" data-telemetry-event="leaderboard_sort">Sort by games</button><button id="retry" data-telemetry-event="leaderboard_retry">Retry</button></div><div id="loading" role="status">Loading leaderboard…</div><div id="error" hidden role="alert">Could not load leaderboard. Try again.</div><div id="empty" hidden role="status">No ranked players yet.</div><table id="leaderboard-table" hidden><caption>Top players by rating</caption><thead><tr><th>Rank</th><th>Player</th><th>Rating</th><th>Games</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table></section>` });
}

export function renderBlogIndex(entries) {
  const items = entries.map((entry) => `<li><a href="/blog/${entry.metadata.slug}">${entry.metadata.title}</a> <small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small><p>${entry.metadata.summary}</p></li>`).join("");
  return renderShell({ title: "Kriegspiel — Blog", description: "Editorial updates from the Kriegspiel team.", activeNav: "/blog", canonicalPath: "/blog", main: `<section><h1>Blog</h1><p>Editorial updates from the Kriegspiel team.</p><ul>${items}</ul><p><a href="/blog/archive">Browse archive</a></p></section>` });
}

export const renderBlogDetail = (entry) => renderShell({ title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: "/blog", canonicalPath: `/blog/${entry.metadata.slug}`, ogType: "article", structuredData: { "@context": "https://schema.org", "@type": "Article", headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { "@type": "Organization", name: entry.metadata.author }, mainEntityOfPage: absUrl(`/blog/${entry.metadata.slug}`) }, main: `<article><h1>${entry.metadata.title}</h1><p><small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small></p><p>${entry.metadata.summary}</p>${entry.bodyHtml}<p><a href="/blog">Back to blog</a></p></article>` });

export function renderBlogArchive(entries) {
  const groups = new Map();
  for (const entry of entries) { const year = String(entry.metadata.publishedAt).slice(0, 4); if (!groups.has(year)) groups.set(year, []); groups.get(year).push(entry); }
  const html = Array.from(groups.entries()).map(([year, posts]) => `<section><h2>${year}</h2><ul>${posts.map((post) => `<li><a href="/blog/${post.metadata.slug}">${post.metadata.title}</a></li>`).join("")}</ul></section>`).join("");
  return renderShell({ title: "Kriegspiel — Blog Archive", description: "Archive of all blog posts.", activeNav: "/blog", canonicalPath: "/blog/archive", main: `<h1>Blog archive</h1>${html}` });
}

export function renderChangelogIndex(entries) {
  const items = entries.map((entry) => `<li><a href="/changelog/${entry.metadata.slug}">${entry.metadata.version} — ${entry.metadata.title}</a> <small>${entry.metadata.publishedAt}</small><p>${entry.metadata.summary}</p></li>`).join("");
  return renderShell({ title: "Kriegspiel — Changelog", description: "Versioned release history and public change notes.", activeNav: "/changelog", canonicalPath: "/changelog", main: `<section><h1>Changelog</h1><p>Versioned release history.</p><ul>${items}</ul></section>` });
}

export const renderChangelogDetail = (entry) => renderShell({ title: `Kriegspiel — ${entry.metadata.title}`, description: entry.metadata.summary, activeNav: "/changelog", canonicalPath: `/changelog/${entry.metadata.slug}`, ogType: "article", structuredData: { "@context": "https://schema.org", "@type": "Article", headline: entry.metadata.title, datePublished: entry.metadata.publishedAt, dateModified: entry.metadata.updatedAt, author: { "@type": "Organization", name: entry.metadata.author }, mainEntityOfPage: absUrl(`/changelog/${entry.metadata.slug}`) }, main: `<article><h1>${entry.metadata.title}</h1><p><small>Version ${entry.metadata.version} • ${entry.metadata.publishedAt}</small></p><p>${entry.metadata.summary}</p>${entry.bodyHtml}<p><a href="/changelog">Back to changelog</a></p></article>` });

export function renderRulesPage(entries, changelogEntries) {
  const changelogBySlug = new Map(changelogEntries.map((entry) => [entry.metadata.slug, entry]));
  const cards = entries.map((entry) => {
    const link = entry.metadata.changelogSlug && changelogBySlug.get(entry.metadata.changelogSlug)
      ? `<a href="/changelog/${entry.metadata.changelogSlug}">Linked changelog</a>`
      : "<span>Linked changelog unavailable</span>";
    const sections = entry.body.split(/\r?\n\r?\n/).filter(Boolean).filter((block) => /^#/.test(block.trim())).slice(0, 4).map((block) => `<li>${esc(block.split(/\r?\n/)[0].replace(/^#+\s*/, ""))}</li>`).join("");
    return `<article><h2>${entry.metadata.title}</h2><p>${entry.metadata.summary}</p><ul><li>Version: ${entry.metadata.version || "n/a"}</li><li>Revision: <code>${entry.metadata.revision || "n/a"}</code></li><li>Last reviewed: ${entry.metadata.lastReviewedAt || entry.metadata.updatedAt || "n/a"}</li></ul><h3>Semantic sections</h3><ul>${sections || "<li>No section headers parsed</li>"}</ul><p>${link}</p></article>`;
  }).join("");
  return renderShell({ title: "Kriegspiel — Rules", description: "Versioned rulesets with traceable revisions and changelog linkage.", activeNav: "/rules", canonicalPath: "/rules", structuredData: { "@context": "https://schema.org", "@type": "WebPage", name: "Kriegspiel Rules", url: absUrl("/rules") }, main: `<section><h1>Rules</h1><p>Versioned rulesets and trust metadata.</p>${cards}</section>` });
}

export const renderPrivacyPage = () => renderShell({ title: "Kriegspiel — Privacy", description: "Privacy notice and analytics disclosure for Kriegspiel web properties.", canonicalPath: "/privacy", main: `<section><h1>Privacy Policy</h1><p>We collect only operational telemetry required to keep the service reliable and improve product quality.</p><ul><li>No PII (name, email, IP, freeform text) in analytics events.</li><li>Events are scoped to product interactions and route performance.</li><li>Analytics can be disabled by consent controls where required.</li></ul><p>Policy owner: legal@kriegspiel.org</p></section>` });

export const renderTermsPage = () => renderShell({ title: "Kriegspiel — Terms", description: "Terms of use for Kriegspiel website and related public services.", canonicalPath: "/terms", main: `<section><h1>Terms of Use</h1><p>By using Kriegspiel web properties, you agree to fair-use and anti-abuse rules.</p><ul><li>Do not abuse automated endpoints.</li><li>Content remains property of its authors and contributors.</li><li>Rules and policy revisions are documented in changelog entries.</li></ul><p>Policy owner: legal@kriegspiel.org</p></section>` });

export const renderSimplePage = (title) => renderShell({ title: `Kriegspiel — ${title}`, description: `${title} page`, canonicalPath: "/404", main: `<h1>${title}</h1><p>Generated by ks-home build.</p>` });

function baseStyles() { return `:root{font-family:system-ui,sans-serif;color-scheme:light dark;}body{margin:0 auto;max-width:960px;padding:1rem;line-height:1.45;}nav{display:flex;flex-wrap:wrap;gap:.75rem;}section{margin:1.5rem 0;}article{border:1px solid #777;padding:1rem;margin:1rem 0;border-radius:.4rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #888;padding:.45rem;text-align:left;}footer{margin-top:2rem;}@media (max-width:700px){nav{gap:.5rem;font-size:.95rem;}table,thead,tbody,tr,th,td{display:block;}tr{border:1px solid #777;margin-bottom:.6rem;}th{display:none;}}`; }
