import test from "node:test";
import assert from "node:assert/strict";
import { renderBlogDetail, renderBlogIndex, renderHomePage, renderLeaderboardPage, renderPublicProfilePage } from "../src/pages.mjs";
import { normalizeLeaderboardPayload, sortEntries, trendMarker } from "../src/leaderboard.mjs";

const homeContent = {
  summary: "Homepage summary",
  heroTitle: "Chess. Beyond what you can see.",
  heroTitleLine1: "Chess.",
  heroTitleLine2: "Beyond what",
  heroTitleEmphasis: "you can see.",
  heroLede: "Your pieces are visible. Your opponent’s are a mystery.",
  heroPrimaryCtaLabel: "Play now",
  heroPrimaryCtaHref: "https://app.kriegspiel.org/",
  heroSecondaryCtaLabel: "Learn the rules",
  heroSecondaryCtaHref: "/rules",
  flowTitle: "The rules change. The instinct stays.",
  flowIntro: "A little uncertainty. A whole new game.",
  flowStep1Title: "Take your side.",
  flowStep1Body: "Join a game in your browser.",
  flowStep2Title: "Trust the referee.",
  flowStep2Body: "Try a move.",
  flowStep3Title: "Think beyond the board.",
  flowStep3Body: "Follow the clues.",
  communityLabelLine1: "Across the board.",
  communityLabelLine2: "Around the world.",
  communityInviteTitle: "Make Saturday a game day.",
  communityInviteBody: "Our weekly human games meetup · Saturdays, 15:00 UTC",
  communityInviteCtaLabel: "Join a game",
  communityInviteCtaHref: "https://app.kriegspiel.org/",
  ctaTitle: "Your next move is a mystery.",
  ctaBody: "There’s only one way to find out.",
  ctaPrimaryLabel: "Let’s play",
  ctaPrimaryHref: "https://app.kriegspiel.org/",
};

test("home page presents the approved open sections and preserves CTA telemetry", () => {
  const html = renderHomePage({
    rulesCount: 2,
    blogCount: 3,
    homeContent: { metadata: homeContent },
    lobbyStats: { completed_total: 21012 },
    generatedAt: "2026-07-06T00:00:00.000Z",
  });
  for (const id of ["hero", "how-it-works", "cta"]) {
    assert.ok(html.includes(`id="${id}"`), `missing section ${id}`);
  }
  assert.ok(html.includes('<section id="hero" class="ks-wrap ks-hero"'));
  assert.ok(html.includes('data-telemetry-event="home_cta_click"'));
  assert.ok(html.includes('>Play now <span aria-hidden="true">↗</span></a>'));
  assert.ok(html.includes('Chess.<br>Beyond what<br> <em>you can see.</em>'));
  assert.ok(html.includes('<ol class="ks-steps"><li><h3>Take your side.</h3>'));
  assert.ok(html.includes('Make Saturday a game day.'));
  assert.ok(html.includes('Our weekly human games meetup · Saturdays, 15:00 UTC'));
  assert.ok(html.includes('>Join a game <span'));
  assert.ok(html.includes('>Let’s play <span'));
  for (const removed of ['class="hero-card__eyebrow"', 'class="ks-number"', 'class="home-stat-card"', 'class="ks-board-top"', 'class="ks-board-caption"', 'class="ks-board-demo"']) {
    assert.ok(!html.includes(removed), `removed prototype element returned: ${removed}`);
  }
});

test("home page uses canonical meetup copy independently of snapshot time and stats", () => {
  const summer = renderHomePage({ homeContent, lobbyStats: { completed_total: 21012 }, generatedAt: "2026-07-06T00:00:00.000Z" });
  const winter = renderHomePage({ homeContent, lobbyStats: { completed_total: 44000 }, generatedAt: "2026-12-07T00:00:00.000Z" });
  assert.equal(summer, winter);
  assert.ok(winter.includes(homeContent.communityInviteBody));
});

test("leaderboard page includes resilient state containers, telemetry hooks, and shared play CTA", () => {
  const html = renderLeaderboardPage([{ handle: "A", label: "A", profilePath: "/players/a", rating: 10, gamesPlayed: 1, isBot: false }]);
  assert.ok(html.includes('id="leaderboard-table"'));
  assert.ok(html.includes('class="leaderboard-table"'));
  assert.ok(!html.includes('Loading leaderboard…'));
  assert.ok(!html.includes('Sort by rating'));
  assert.ok(!html.includes('Sort by games'));
  assert.ok(html.includes('site-header__play'));
  assert.ok(html.includes('button-link--primary'));
  assert.ok(html.includes('href="https://app.kriegspiel.org/"'));
  assert.ok(html.includes('>Play <span aria-hidden="true">↗</span></a>'));
  assert.ok(!html.includes('href="/players/a"'));
  assert.ok(html.includes('Top human players by overall rating'));
  assert.ok(html.includes('Overall rating'));
  assert.ok(!html.includes('Trend'));
  const navHtml = html.match(/<nav class="site-nav"[^>]*aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.ok(!navHtml.includes('>Home</a>'));
  assert.ok(!navHtml.includes('>Changelog</a>'));
  assert.ok(navHtml.includes('>Leaderboard</a>'));
  assert.ok(navHtml.includes('>Blog</a>'));
  assert.ok(navHtml.includes('>Rules</a>'));
  assert.ok(navHtml.includes('>Play <span aria-hidden="true">↗</span></a>'));
  assert.ok(!navHtml.includes('>Subscription</a>'));
  assert.ok(html.includes('>Rules</h2>'));
  assert.ok(html.includes('>Communication</h2>'));
  assert.ok(html.includes('X.com (@kriegspiel_org)'));
  assert.ok(html.includes('https://app.kriegspiel.org/leaderboard'));
  assert.ok(!html.includes('table,thead,tbody,tr,th,td{display:block;}'));
  assert.ok(html.includes('.table-wrap th, .table-wrap td { padding: .7rem .75rem; }'));
  assert.ok(html.includes('.leaderboard-table th:nth-child(2), .leaderboard-table td:nth-child(2) { min-width: 10rem; }'));
});

test("normalize payload handles malformed, invalid players, and stale states", () => {
  const malformedPayloadType = normalizeLeaderboardPayload(null);
  assert.ok(malformedPayloadType.issues.some((issue) => issue.includes("payload must be an object")));

  const malformedPlayers = normalizeLeaderboardPayload({ players: "oops" });
  assert.deepEqual(malformedPlayers.entries, []);
  assert.ok(malformedPlayers.issues.some((issue) => issue.includes("players must be an array")));

  const stale = normalizeLeaderboardPayload({
    updatedAt: "2020-01-01T00:00:00.000Z",
    players: [
      { handle: "A", rating: 1200, gamesPlayed: 12, trend: "up" },
      "bad",
      { handle: "", rating: 1200, gamesPlayed: 12, trend: "unknown" }
    ]
  }, Date.parse("2020-01-01T01:00:00.000Z"));

  assert.equal(stale.stale, true);
  assert.equal(stale.entries.length, 1);
  assert.ok(stale.issues.some((issue) => issue.includes("must be an object")));
  assert.ok(stale.issues.some((issue) => issue.includes("missing required fields")));
});

test("sorting supports rating and gamesPlayed asc/desc with tie-breakers", () => {
  const entries = [
    { handle: "Zed", rating: 100, gamesPlayed: 10, trend: "flat" },
    { handle: "Amy", rating: 100, gamesPlayed: 8, trend: "up" },
    { handle: "Bee", rating: 120, gamesPlayed: 5, trend: "down" }
  ];

  const byRatingDesc = sortEntries(entries);
  assert.deepEqual(byRatingDesc.map((x) => x.handle), ["Bee", "Amy", "Zed"]);

  const byGamesAsc = sortEntries(entries, "gamesPlayed", "asc");
  assert.deepEqual(byGamesAsc.map((x) => x.handle), ["Bee", "Amy", "Zed"]);

  assert.equal(trendMarker("up"), "↑");
  assert.equal(trendMarker("down"), "↓");
  assert.equal(trendMarker("other"), "→");
});

test("public profile page renders stats and elo history", () => {
  const html = renderPublicProfilePage({
    profile: {
      username: "fil",
      display_name: "fil",
      role: "user",
      is_bot: false,
      profile: { bio: "Enjoys Kriegspiel.", avatar_url: null, country: "US" },
      stats: { games_played: 7, games_won: 4, games_lost: 2, games_drawn: 1, elo: 1320, elo_peak: 1330 },
      member_since: "2026-01-01T00:00:00.000Z",
    },
    games: [
      { game_id: "g1", opponent: "rival", result: "win", played_at: "2026-02-01T00:00:00.000Z", elo_after: 1300, elo_delta: 12 },
      { game_id: "g2", opponent: "other", result: "loss", played_at: "2026-02-02T00:00:00.000Z", elo_after: 1320, elo_delta: 20 },
    ],
  });

  assert.ok(html.includes("Player profile for @fil."));
  assert.ok(!html.includes('class="hero-card hero-card--logo"'));
  assert.ok(html.includes(">Elo<"));
  assert.ok(html.includes(">Peak Elo<"));
  assert.ok(html.includes("Elo rating over time"));
  assert.ok(html.includes("Back to leaderboard"));
});

test("blog pages show date, author, tags, and singular reading time", () => {
  const entry = {
    metadata: {
      slug: "welcome",
      title: "Launch notes for the website track",
      summary: "Just a launch note, to keep track of days.",
      publishedAt: "2026-03-27",
      updatedAt: "2026-03-28",
      author: "Kriegspiel Team",
      tags: ["website", "announcement"],
    },
    body: "Just a launch note, to keep track of days.",
    bodyHtml: "<p>Just a launch note, to keep track of days.</p>"
  };

  const indexHtml = renderBlogIndex([entry]);
  assert.ok(indexHtml.includes("Notes and updates about Kriegspiel."));
  assert.ok(indexHtml.includes("2026-03-27"));
  assert.ok(indexHtml.includes('<time datetime="2026-03-27">2026-03-27</time>'));
  assert.ok(indexHtml.includes("Kriegspiel Team"));
  assert.ok(indexHtml.includes("1 min read"));
  assert.ok(!indexHtml.includes("1 mins read"));
  assert.ok(indexHtml.includes('href="/feed.xml">RSS feed</a>'));

  const detailHtml = renderBlogDetail(entry);
  assert.ok(detailHtml.includes("2026-03-27"));
  assert.ok(detailHtml.includes("Updated <time datetime=\"2026-03-28\">2026-03-28</time>"));
  assert.ok(detailHtml.includes("By Kriegspiel Team"));
  assert.ok(detailHtml.includes('<span class="article-tag">website</span>'));
  assert.ok(detailHtml.includes('<span class="article-tag">announcement</span>'));
  assert.ok(detailHtml.includes("1 min read"));
  assert.ok(!detailHtml.includes("1 mins read"));
  assert.ok(detailHtml.includes('"@type":"BlogPosting"'));
  assert.ok(detailHtml.includes('"author":{"@type":"Organization","name":"Kriegspiel Team"}'));
});

test("blog pages show plural reading time for longer posts", () => {
  const entry = {
    metadata: {
      slug: "long-note",
      title: "Long note",
      summary: "A longer note.",
      publishedAt: "2026-04-01",
      updatedAt: "2026-04-01",
    },
    body: Array.from({ length: 221 }, (_, index) => `word${index}`).join(" "),
    bodyHtml: "<p>A longer note.</p>"
  };

  const indexHtml = renderBlogIndex([entry]);
  assert.ok(indexHtml.includes("2 mins read"));
  assert.ok(!indexHtml.includes("2 min read"));

  const detailHtml = renderBlogDetail(entry);
  assert.ok(detailHtml.includes("2 mins read"));
  assert.ok(!detailHtml.includes("2 min read"));
});
