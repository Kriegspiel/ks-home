const SITE_URL = "https://kriegspiel.org";
const FEED_TITLE = "Kriegspiel Updates";
const FEED_DESCRIPTION = "Blog posts and public changelog updates from Kriegspiel.org.";

export function buildUpdateFeedEntries(blogEntries = [], changelogEntries = []) {
  return [...blogEntries, ...changelogEntries]
    .map((entry) => ({
      title: entry.metadata.title,
      summary: entry.metadata.summary,
      author: entry.metadata.author || "Kriegspiel Team",
      tags: Array.isArray(entry.metadata.tags) ? entry.metadata.tags : [],
      publishedAt: entry.metadata.publishedAt,
      updatedAt: entry.metadata.updatedAt || entry.metadata.publishedAt,
      path: `/${entry.collection}/${entry.metadata.slug}`,
    }))
    .sort((left, right) => String(right.publishedAt).localeCompare(String(left.publishedAt)));
}

export function renderRssFeed(entries = [], now = new Date()) {
  const items = entries.map((entry) => {
    const url = absoluteUrl(entry.path);
    const categories = entry.tags.map((tag) => `<category>${xmlEscape(tag)}</category>`).join("");
    return `<item><title>${xmlEscape(entry.title)}</title><link>${xmlEscape(url)}</link><guid isPermaLink="true">${xmlEscape(url)}</guid><pubDate>${rssDate(entry.publishedAt)}</pubDate><description>${xmlEscape(entry.summary)}</description>${categories}</item>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${FEED_TITLE}</title><link>${SITE_URL}/</link><atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" /><description>${FEED_DESCRIPTION}</description><language>en</language><lastBuildDate>${rssDate(now)}</lastBuildDate>${items}</channel></rss>\n`;
}

export function renderAtomFeed(entries = [], now = new Date()) {
  const updated = latestIsoDate(entries.map((entry) => entry.updatedAt), now);
  const items = entries.map((entry) => {
    const url = absoluteUrl(entry.path);
    return `<entry><title>${xmlEscape(entry.title)}</title><id>${xmlEscape(url)}</id><link href="${xmlEscape(url)}" /><published>${isoDate(entry.publishedAt)}</published><updated>${isoDate(entry.updatedAt)}</updated><author><name>${xmlEscape(entry.author)}</name></author><summary>${xmlEscape(entry.summary)}</summary></entry>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>${FEED_TITLE}</title><id>${SITE_URL}/</id><link href="${SITE_URL}/" /><link rel="self" href="${SITE_URL}/atom.xml" type="application/atom+xml" /><updated>${updated}</updated>${items}</feed>\n`;
}

export function buildSitemapRoutes({
  blogEntries = [],
  changelogEntries = [],
  rulesEntries = [],
  siteEntries = {},
  playerRoutes = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const routes = [
    { path: "/", lastmod: siteEntries.home?.metadata?.updatedAt },
    { path: "/leaderboard", lastmod: generatedAt },
    { path: "/blog", lastmod: latestEntryDate(blogEntries) },
    { path: "/blog/archive", lastmod: latestEntryDate(blogEntries) },
    { path: "/changelog", lastmod: latestEntryDate(changelogEntries) },
    { path: "/rules", lastmod: latestEntryDate(rulesEntries) },
    { path: "/rules/comparison", lastmod: latestEntryDate(rulesEntries) },
    { path: "/subscription", lastmod: generatedAt },
    { path: "/privacy", lastmod: siteEntries.privacy?.metadata?.updatedAt },
    { path: "/terms", lastmod: siteEntries.terms?.metadata?.updatedAt },
    { path: "/about", lastmod: siteEntries.about?.metadata?.updatedAt },
    { path: "/playing", lastmod: siteEntries.playing?.metadata?.updatedAt },
    ...blogEntries.map((entry) => ({ path: `/blog/${entry.metadata.slug}`, lastmod: entry.metadata.updatedAt || entry.metadata.publishedAt })),
    ...changelogEntries.map((entry) => ({ path: `/changelog/${entry.metadata.slug}`, lastmod: entry.metadata.updatedAt || entry.metadata.publishedAt })),
    ...rulesEntries.map((entry) => ({ path: `/rules/${entry.metadata.slug}`, lastmod: entry.metadata.updatedAt || entry.metadata.publishedAt })),
    ...playerRoutes.map((path) => ({ path, lastmod: generatedAt })),
  ];

  const seen = new Set();
  return routes.filter((route) => {
    if (!route.path || seen.has(route.path)) return false;
    seen.add(route.path);
    return true;
  });
}

export function renderSitemap(routes = []) {
  const urls = routes.map((route) => {
    const lastmod = route.lastmod ? `<lastmod>${xmlEscape(dateOnly(route.lastmod))}</lastmod>` : "";
    return `  <url><loc>${xmlEscape(absoluteUrl(route.path))}</loc>${lastmod}</url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rssDate(value) {
  return validDate(value).toUTCString();
}

function isoDate(value) {
  return validDate(value).toISOString();
}

function dateOnly(value) {
  return isoDate(value).slice(0, 10);
}

function validDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function latestIsoDate(values, fallback) {
  return validDate(values.reduce((latest, value) => {
    const timestamp = validDate(value).getTime();
    return timestamp > validDate(latest).getTime() ? value : latest;
  }, fallback)).toISOString();
}

function latestEntryDate(entries) {
  if (!entries.length) return "";
  return latestIsoDate(entries.map((entry) => entry.metadata.updatedAt || entry.metadata.publishedAt), entries[0].metadata.publishedAt);
}
