import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getContentRoot, loadCollection, loadSingletonEntry } from "../src/content-utils.mjs";
import { buildSitemapRoutes, renderSitemap } from "../src/site-feeds.mjs";

const contentRoot = getContentRoot();
const blogEntries = loadCollection(contentRoot, "blog");
const changelogEntries = loadCollection(contentRoot, "changelog");
const rulesEntries = loadCollection(contentRoot, "rules");
const homeEntry = loadSingletonEntry(contentRoot, "site", "home");
const privacyEntry = loadSingletonEntry(contentRoot, "site", "privacy");
const termsEntry = loadSingletonEntry(contentRoot, "site", "terms");
const aboutEntry = loadSingletonEntry(contentRoot, "site", "about");
const manifestPath = path.join(process.cwd(), "dist/.regen-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const xml = renderSitemap(buildSitemapRoutes({
  blogEntries,
  changelogEntries,
  rulesEntries,
  siteEntries: { home: homeEntry, privacy: privacyEntry, terms: termsEntry, about: aboutEntry },
  playerRoutes: Array.isArray(manifest.playerRoutes) ? manifest.playerRoutes : [],
  generatedAt: manifest.generatedAt || new Date().toISOString(),
}));
fs.mkdirSync(path.join(process.cwd(), "dist"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "dist/sitemap.xml"), xml, "utf8");
if (process.argv.includes("--check")) {
  assert.ok(xml.includes("https://kriegspiel.org/blog"));
  assert.ok(xml.includes("https://kriegspiel.org/changelog"));
  assert.ok(xml.includes("https://kriegspiel.org/rules/berkeley"));
  assert.ok(xml.includes("<lastmod>"));
}
console.log("sitemap generated");
