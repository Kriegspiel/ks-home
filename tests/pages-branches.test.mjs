import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  renderHomePage,
  renderLeaderboardPage,
  renderPublicProfilePage,
  renderShell,
} from "../src/pages.mjs";

const PACKAGE_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

function footerGroupHtml(html, label) {
  return html.match(new RegExp(`<section class="footer__group" aria-label="${label}">[\\s\\S]*?</section>`))?.[0] ?? "";
}

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
  assert.ok(emptyFooterHtml.includes('<link rel="alternate" type="application/rss+xml" title="Kriegspiel Updates RSS" href="https://kriegspiel.org/feed.xml" />'));
  assert.ok(emptyFooterHtml.includes('<link rel="alternate" type="application/atom+xml" title="Kriegspiel Updates Atom" href="https://kriegspiel.org/atom.xml" />'));
  assert.ok(emptyFooterHtml.includes('<meta property="og:image" content="https://kriegspiel.org/social-card-20260511.png" />'));
  assert.ok(emptyFooterHtml.includes('<meta name="twitter:image" content="https://kriegspiel.org/social-card-20260511.png" />'));
  assert.ok(emptyFooterHtml.includes(`<script src="/fen-board.js?v=${PACKAGE_VERSION}" defer></script>`));
  assert.ok(emptyFooterHtml.includes(`<script src="/attribution.js?v=${PACKAGE_VERSION}" defer></script>`));
  assert.ok(emptyFooterHtml.includes("--square-capture-overlay:transparent"));
  assert.ok(emptyFooterHtml.includes("var(--square-ring-capture),var(--square-ring-illegal),var(--square-ring-suggested)"));
  assert.ok(emptyFooterHtml.includes(".fen-board{width:22rem;max-width:100%;user-select:none;-webkit-user-select:none;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board{flex:0 1 auto;min-width:0;}"));
  assert.ok(emptyFooterHtml.includes("@media (max-width:640px){.fen-board{width:30rem;max-width:100%;}"));
  assert.ok(emptyFooterHtml.includes("@media (max-width:640px){.fen-diagram__workspace{gap:.45rem;}.fen-board{width:30rem;max-width:100%;flex:0 1 auto;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board-tools{flex:0 0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));"));
  assert.ok(emptyFooterHtml.includes(".fen-board-tools .fen-board-tools__button:disabled{opacity:.46;cursor:not-allowed;"));
  assert.ok(emptyFooterHtml.includes("grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));"));
  assert.ok(emptyFooterHtml.includes(".fen-board__square{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;width:100%;height:100%;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board__coord--file{right:.28rem;bottom:.34rem;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board__coord{font-size:.52rem;}.fen-board__coord--file{bottom:.32rem;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board__square.square--highlighted"));
  assert.ok(emptyFooterHtml.includes(".fen-board__square.square--suggested"));
  assert.ok(emptyFooterHtml.includes("touch-action:none;-webkit-tap-highlight-color:transparent;transition:filter .12s ease;"));
  assert.ok(emptyFooterHtml.includes(".fen-board__piece{touch-action:none;user-select:none;-webkit-user-select:none;}"));
  assert.ok(emptyFooterHtml.includes("@media (hover:none),(pointer:coarse){.fen-board__grid .fen-board__square"));
  assert.ok(emptyFooterHtml.includes(".fen-diagram[data-fen-dragging=\"true\"] .fen-board__piece{cursor:grabbing;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board__grid .fen-board__square:hover,.fen-board__grid .fen-board__square:focus-visible,.fen-board__grid .fen-board__square:active{border-color:transparent;transform:none;outline:none;filter:none;}"));
  assert.ok(emptyFooterHtml.includes(".fen-board__square.square--suggested,.fen-board__square[data-fen-drag-over=\"true\"]{--square-ring-suggested:inset 0 0 0 .16rem rgba(34,197,94,.78);}"));
  assert.ok(!emptyFooterHtml.includes("filter:brightness(1.08);z-index:4"));
  assert.ok(!emptyFooterHtml.includes(".fen-board__grid .fen-board__square:focus-visible{outline:2px solid var(--text);outline-offset:-2px;z-index:5;}"));
  assert.ok(emptyFooterHtml.includes('aria-current="page">Play</a>'));
  assert.ok(!emptyFooterHtml.includes(">Rules</h2>"));

  const fallbackFooterHtml = renderShell({
    title: "Fallback shell",
    description: "Fallback description",
    main: "<p>hello</p>",
  });
  assert.ok(fallbackFooterHtml.includes(">Rules</h2>"));
  assert.ok(!fallbackFooterHtml.includes('<a href="/rules/dutch">Dutch</a>'));
  assert.ok(fallbackFooterHtml.includes(">Communication</h2>"));
  assert.ok(fallbackFooterHtml.includes('<a href="/feed.xml">RSS</a>'));
  assert.ok(fallbackFooterHtml.includes(">Social</h2>"));

  const communicationFooter = footerGroupHtml(fallbackFooterHtml, "Communication");
  assert.ok(communicationFooter.includes('<a href="/blog">Blog</a></li><li><a href="/changelog">Changelog</a></li><li><a href="/feed.xml">RSS</a></li><li><a href="/about">About</a>'));

  const legacyFooterHtml = renderShell({
    title: "Legacy footer shell",
    description: "Footer description",
    main: "<p>hello</p>",
    footerEntry: {
      body: "# Communication\n- [Blog](/blog)\n- [Changelog](/changelog)\n- [About](/about)\n",
    },
  });
  const legacyCommunicationFooter = footerGroupHtml(legacyFooterHtml, "Communication");
  assert.ok(legacyCommunicationFooter.includes('<a href="/blog">Blog</a></li><li><a href="/changelog">Changelog</a></li><li><a href="/feed.xml">RSS</a></li><li><a href="/about">About</a>'));
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
