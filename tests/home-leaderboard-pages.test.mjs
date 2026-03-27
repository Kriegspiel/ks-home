import test from "node:test";
import assert from "node:assert/strict";
import { renderHomePage, renderLeaderboardPage } from "../src/pages.mjs";
import { normalizeLeaderboardPayload, sortEntries, trendMarker } from "../src/leaderboard.mjs";

test("home page includes required sections and CTA telemetry", () => {
  const html = renderHomePage({ rulesCount: 2, blogCount: 3 });
  for (const id of ["hero", "how-it-works", "key-features", "cta", "trust-snippet"]) {
    assert.ok(html.includes(`id=\"${id}\"`), `missing section ${id}`);
  }
  assert.ok(html.includes("data-telemetry-event=\"home_cta_click\""));
});

test("leaderboard page includes resilient state containers and telemetry hooks", () => {
  const html = renderLeaderboardPage([{ handle: "A", rating: 10, gamesPlayed: 1, trend: "up" }]);
  for (const id of ["loading", "error", "empty", "stale-banner", "leaderboard-table"]) {
    assert.ok(html.includes(`id=\"${id}\"`), `missing state ${id}`);
  }
  assert.ok(html.includes("data-telemetry-event=\"leaderboard_sort\""));
  assert.ok(html.includes("data-telemetry-event=\"leaderboard_retry\""));
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
