import test from "node:test";
import assert from "node:assert/strict";
import { renderRulesPage, renderPrivacyPage, renderTermsPage } from "../src/pages.mjs";

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

test("privacy and terms routes include policy owner", () => {
  assert.ok(renderPrivacyPage().includes("Privacy Policy"));
  assert.ok(renderPrivacyPage().includes("legal@kriegspiel.org"));
  assert.ok(renderTermsPage().includes("Terms of Use"));
  assert.ok(renderTermsPage().includes("legal@kriegspiel.org"));
});
