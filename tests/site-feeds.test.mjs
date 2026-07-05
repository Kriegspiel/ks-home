import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSitemapRoutes,
  buildUpdateFeedEntries,
  renderAtomFeed,
  renderRssFeed,
  renderSitemap,
} from "../src/site-feeds.mjs";

const blogEntry = {
  collection: "blog",
  metadata: {
    slug: "research-map",
    title: "Research & history",
    summary: "A <compact> guide & map.",
    publishedAt: "2026-04-18",
    updatedAt: "2026-05-21",
    author: "Kriegspiel Team",
    tags: ["research", "history"],
  },
};

const changelogEntry = {
  collection: "changelog",
  metadata: {
    slug: "2026-04-29-v1-3-0",
    title: "Version 1.3.0",
    summary: "Guest play and review updates.",
    publishedAt: "2026-04-29",
    updatedAt: "2026-04-29",
    author: "Kriegspiel Team",
    tags: ["release"],
  },
};

test("update feeds sort entries and XML-escape content", () => {
  const entries = buildUpdateFeedEntries([blogEntry], [changelogEntry]);
  assert.deepEqual(entries.map((entry) => entry.path), [
    "/changelog/2026-04-29-v1-3-0",
    "/blog/research-map",
  ]);

  const rss = renderRssFeed(entries, "2026-05-24T00:00:00.000Z");
  assert.ok(rss.includes('xmlns:atom="http://www.w3.org/2005/Atom"'));
  assert.ok(rss.includes("<title>Research &amp; history</title>"));
  assert.ok(rss.includes("<description>A &lt;compact&gt; guide &amp; map.</description>"));
  assert.ok(rss.includes("<category>research</category>"));
  assert.ok(rss.includes("<lastBuildDate>Sun, 24 May 2026 00:00:00 GMT</lastBuildDate>"));

  const atom = renderAtomFeed(entries, "2026-05-24T00:00:00.000Z");
  assert.ok(atom.includes('<link rel="self" href="https://kriegspiel.org/atom.xml" type="application/atom+xml" />'));
  assert.ok(atom.includes("<published>2026-04-18T00:00:00.000Z</published>"));
  assert.ok(atom.includes("<updated>2026-05-21T00:00:00.000Z</updated>"));
  assert.ok(atom.includes("<author><name>Kriegspiel Team</name></author>"));
});

test("sitemap includes static, content, and player routes with lastmod", () => {
  const routes = buildSitemapRoutes({
    blogEntries: [blogEntry],
    changelogEntries: [changelogEntry],
    rulesEntries: [{
      metadata: {
        slug: "berkeley",
        publishedAt: "2026-03-27",
        updatedAt: "2026-04-01",
      },
    }],
    siteEntries: {
      home: { metadata: { updatedAt: "2026-03-27" } },
      privacy: { metadata: { updatedAt: "2026-03-28" } },
      terms: { metadata: { updatedAt: "2026-03-29" } },
      about: { metadata: { updatedAt: "2026-03-30" } },
      playing: { metadata: { updatedAt: "2026-07-05" } },
      levels: { metadata: { updatedAt: "2026-07-05" } },
    },
    playerRoutes: ["/players/refereefox", "/blog/research-map"],
    generatedAt: "2026-05-24T00:00:00.000Z",
  });

  assert.equal(routes.filter((route) => route.path === "/blog/research-map").length, 1);

  const sitemap = renderSitemap(routes);
  assert.ok(sitemap.includes("<loc>https://kriegspiel.org/</loc><lastmod>2026-03-27</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://kriegspiel.org/playing</loc><lastmod>2026-07-05</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://kriegspiel.org/levels</loc><lastmod>2026-07-05</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://kriegspiel.org/rules/berkeley</loc><lastmod>2026-04-01</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://kriegspiel.org/players/refereefox</loc><lastmod>2026-05-24</lastmod>"));
});
