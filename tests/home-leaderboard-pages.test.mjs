import test from "node:test";
import assert from "node:assert/strict";
import { renderHomePage, renderLeaderboardPage } from "../src/pages.mjs";
import { normalizeLeaderboardPayload, sortEntries, trendMarker } from "../src/leaderboard.mjs";

const homeContent = {
  summary: "Homepage summary",
  eyebrow: "",
  heroTitle: "Play Hidden-Information Chess Online",
  heroLede: "Simple, fun, and ready when you are. Jump into a game in your browser where you know your pieces, not your opponent’s board.",
  heroPrimaryCtaLabel: "Play now",
  heroPrimaryCtaHref: "https://app.kriegspiel.org/",
  heroSecondaryCtaLabel: "Learn the rules",
  heroSecondaryCtaHref: "/rules",
  statsRulesLabel: "Play style",
  statsUpdatesLabel: "Turns",
  statsThirdLabel: "Start",
  statsThirdValue: "Right now",
  flowKicker: "Flow",
  flowTitle: "Start in under a minute",
  flowIntro: "No brochure tour. Just the basics you need before you click play.",
  flowStep1Title: "Join a game",
  flowStep1Body: "Open it in your browser and get matched without fuss.",
  flowStep2Title: "Make your move",
  flowStep2Body: "The referee handles what each player is allowed to know.",
  flowStep3Title: "Stay in the mystery",
  flowStep3Body: "Every turn keeps the tension that makes Kriegspiel fun.",
  featuresKicker: "Why it feels different",
  featuresTitle: "Key features",
  featuresIntro: "Closer to the app’s product language, still clearly a public-facing landing page.",
  feature1Title: "Asymmetric information preserved",
  feature1Body: "Fog of war is the point.",
  feature2Title: "Fast async-friendly play",
  feature2Body: "Built for players who want serious variant structure without clunky ceremony.",
  feature3Title: "Variant-specific referee output",
  feature3Body: "Rules, updates, and play surfaces now feel like they belong to the same family.",
  ctaKicker: "Ready to play?",
  ctaTitle: "Ready to play?",
  ctaBody: "Jump in now, or read the rules first if you want a quick primer before your first game.",
  ctaPrimaryLabel: "Play now",
  ctaPrimaryHref: "https://app.kriegspiel.org/",
  ctaSecondaryLabel: "Read rules",
  ctaSecondaryHref: "/rules",
  trustKicker: "Trust snapshot",
  trustTitle: "One quick note",
  trustRulesTitle: "",
  trustRulesBodyTemplate: "",
  trustUpdatesTitle: "Shipped updates",
  trustUpdatesBodyTemplate: "{{blogCount}} public updates are already live."
};

test("home page keeps a simplified play-first layout with CTA telemetry", () => {
  const html = renderHomePage({ rulesCount: 2, blogCount: 3, homeContent });
  for (const id of ["hero", "how-it-works", "cta"]) {
    assert.ok(html.includes(`id="${id}"`), `missing section ${id}`);
  }
  assert.ok(!html.includes('id="key-features"'));
  assert.ok(!html.includes('id="trust-snippet"'));
  assert.ok(html.includes('data-telemetry-event="home_cta_click"'));
  assert.ok(html.includes('>Play now<'));
  assert.ok(html.includes('Play Hidden-Information Chess Online'));
  assert.ok(!html.includes('published rulesets'));
  assert.ok(html.includes('hidden'));
  assert.ok(html.includes('class="hero-card__eyebrow" hidden'));
  assert.ok(!html.includes('class="hero-card__eyebrow">Kriegspiel.org<'));
  assert.ok(!html.includes('3 public updates are already live.'));
});

test("leaderboard page includes resilient state containers, telemetry hooks, and shared play CTA", () => {
  const html = renderLeaderboardPage([{ handle: "A", rating: 10, gamesPlayed: 1, trend: "up" }]);
  for (const id of ["loading", "error", "empty", "stale-banner", "leaderboard-table"]) {
    assert.ok(html.includes(`id="${id}"`), `missing state ${id}`);
  }
  assert.ok(html.includes('data-telemetry-event="leaderboard_sort"'));
  assert.ok(html.includes('data-telemetry-event="leaderboard_retry"'));
  assert.ok(html.includes('site-header__play'));
  assert.ok(html.includes('button-link--primary'));
  assert.ok(html.includes('href="https://app.kriegspiel.org/"'));
  assert.ok(html.includes('>Play</a>'));
  const navHtml = html.match(/<nav class="site-nav" aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.ok(!navHtml.includes('>Home</a>'));
  assert.ok(!navHtml.includes('>Changelog</a>'));
  assert.ok(navHtml.includes('>Leaderboard</a>'));
  assert.ok(navHtml.includes('>Blog</a>'));
  assert.ok(navHtml.includes('>Rules</a>'));
  assert.ok(navHtml.includes('>Play</a>'));
  assert.ok(html.includes('>Rules</h2>'));
  assert.ok(html.includes('>Communication</h2>'));
  assert.ok(html.includes('X.com (@kriegspiel_org)'));
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
