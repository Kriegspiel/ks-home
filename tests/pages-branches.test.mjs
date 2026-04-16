import test from "node:test";
import assert from "node:assert/strict";

import {
  renderHomePage,
  renderLeaderboardPage,
  renderPublicProfilePage,
  renderShell,
} from "../src/pages.mjs";

test("renderShell falls back canonical paths and footer variants", () => {
  const emptyFooterHtml = renderShell({
    title: "Demo shell",
    description: "Shell description",
    main: "<p>hello</p>",
    activeNav: "https://app.kriegspiel.org/",
    canonicalPath: "",
    footerEntry: {},
  });

  assert.ok(emptyFooterHtml.includes('<link rel="canonical" href="https://kriegspiel.org/" />'));
  assert.ok(emptyFooterHtml.includes('aria-current="page">Play</a>'));
  assert.ok(!emptyFooterHtml.includes(">Rules</h2>"));

  const fallbackFooterHtml = renderShell({
    title: "Fallback shell",
    description: "Fallback description",
    main: "<p>hello</p>",
  });
  assert.ok(fallbackFooterHtml.includes(">Rules</h2>"));
  assert.ok(fallbackFooterHtml.includes(">Communication</h2>"));
  assert.ok(fallbackFooterHtml.includes(">Social</h2>"));
});

test("home page falls back when content is sparse or missing metadata wrappers", () => {
  const sparseHomeHtml = renderHomePage({
    homeContent: {
      heroTitle: "Play now",
      heroLede: "A minimal homepage still renders.",
      heroPrimaryCtaLabel: "Play",
      heroPrimaryCtaHref: "https://app.kriegspiel.org/",
      heroSecondaryCtaLabel: "Rules",
      heroSecondaryCtaHref: "/rules",
      flowTitle: "Flow",
      flowIntro: "Three quick steps.",
      flowStep1Title: "Join",
      flowStep1Body: "Join a match.",
      flowStep2Title: "Move",
      flowStep2Body: "Make a move.",
      flowStep3Title: "Repeat",
      flowStep3Body: "Keep going.",
      ctaTitle: "Ready?",
      ctaBody: "Play or read the rules.",
      ctaPrimaryLabel: "Play",
      ctaPrimaryHref: "https://app.kriegspiel.org/",
      ctaSecondaryLabel: "Rules",
      ctaSecondaryHref: "/rules",
    },
  });

  assert.ok(sparseHomeHtml.includes("Play hidden-information chess online with trusted referee semantics."));
  assert.ok(sparseHomeHtml.includes('class="hero-card__eyebrow" hidden'));

  const missingHomeHtml = renderHomePage({});
  assert.ok(missingHomeHtml.includes("<title>Kriegspiel — Home</title>"));
  assert.ok(missingHomeHtml.includes("Play hidden-information chess online with trusted referee semantics."));
});

test("leaderboard page falls back for missing labels and unknown timestamps", () => {
  const invalidTimestampHtml = renderLeaderboardPage([
    { handle: "solo-player", rating: 1500, gamesPlayed: 4, isBot: false },
  ], null, "not-a-date");

  assert.ok(invalidTimestampHtml.includes("<td>solo-player</td>"));
  assert.ok(invalidTimestampHtml.includes("Static snapshot updated not-a-date"));

  const unknownTimestampHtml = renderLeaderboardPage([], null, "");
  assert.ok(unknownTimestampHtml.includes("Static snapshot updated Unknown"));
});

test("public profile page covers bot fallbacks and empty history", () => {
  const html = renderPublicProfilePage({
    profile: {
      is_bot: true,
      profile: {},
      stats: {},
      member_since: "",
    },
    games: [],
  });

  assert.ok(html.includes("Unknown player"));
  assert.ok(html.includes("Bot profile for @."));
  assert.ok(html.includes("Member since Unknown"));
  assert.ok(html.includes("No completed games with rating history yet."));
  assert.ok(html.includes("0 (0.0%)"));
  assert.ok(html.includes('"@type":"SoftwareApplication"'));
});

test("public profile page handles single-point histories and invalid member dates", () => {
  const html = renderPublicProfilePage({
    profile: {
      username: "solo",
      is_bot: false,
      profile: { bio: "" },
      stats: {
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_drawn: 0,
        elo: 1500,
        elo_peak: 1500,
      },
      member_since: "not-a-date",
    },
    games: [
      { game_id: "g-1", elo_after: 1500 },
    ],
  });

  assert.ok(html.includes("Player profile for @solo."));
  assert.ok(html.includes("Member since not-a-date"));
  assert.ok(html.includes("Game 1: 1500"));
  assert.ok(!html.includes("(+"));
  assert.ok(html.includes("Start 1500"));
  assert.ok(html.includes("Latest 1500"));
});
