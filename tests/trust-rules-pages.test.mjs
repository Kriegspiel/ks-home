import test from "node:test";
import assert from "node:assert/strict";
import { renderRulesPage, renderSiteMarkdownPage } from "../src/pages.mjs";

test("rules page shows revision metadata and changelog links", () => {
  const html = renderRulesPage([
    { metadata: { title: "Berkeley", summary: "Rules", version: "1.0.0", revision: "rules-berkeley-r1", lastReviewedAt: "2026-03-27", changelogSlug: "2026-03-27-slice-940-trust-discoverability" }, body: "# Intro\n\n## Section One" }
  ], [
    { metadata: { slug: "2026-03-27-slice-940-trust-discoverability" } }
  ]);
  assert.ok(html.includes("rules-berkeley-r1"));
  assert.ok(html.includes("/changelog/2026-03-27-slice-940-trust-discoverability"));
  assert.ok(html.includes("Semantic sections"));
});

test("site markdown pages render policy content from content repo entries", () => {
  const privacyHtml = renderSiteMarkdownPage({ metadata: { title: "Privacy Policy", summary: "Privacy notice", slug: "privacy" }, bodyHtml: "<p>Policy owner: legal@kriegspiel.org</p>" });
  const termsHtml = renderSiteMarkdownPage({ metadata: { title: "Terms of Use", summary: "Terms notice", slug: "terms" }, bodyHtml: "<p>Policy owner: legal@kriegspiel.org</p>" });
  assert.ok(privacyHtml.includes("Privacy Policy"));
  assert.ok(privacyHtml.includes("legal@kriegspiel.org"));
  assert.ok(termsHtml.includes("Terms of Use"));
  assert.ok(termsHtml.includes("legal@kriegspiel.org"));
});
