import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getContentRoot, loadCollection, loadSingletonEntry } from "../src/content-utils.mjs";
import { renderHomePage, renderLeaderboardPage, renderSimplePage, renderBlogIndex, renderBlogDetail, renderBlogArchive, renderChangelogIndex, renderChangelogDetail, renderRulesPage, renderSiteMarkdownPage } from "../src/pages.mjs";

const dist = path.resolve(process.cwd(), "dist");
const contentRoot = getContentRoot();
const blogEntries = loadCollection(contentRoot, "blog");
const changelogEntries = loadCollection(contentRoot, "changelog");
const rulesEntries = loadCollection(contentRoot, "rules");
const homeEntry = loadSingletonEntry(contentRoot, "site", "home");
const privacyEntry = loadSingletonEntry(contentRoot, "site", "privacy");
const termsEntry = loadSingletonEntry(contentRoot, "site", "terms");

const seedLeaderboard = [
  { handle: "RefereeFox", rating: 1968, gamesPlayed: 122, trend: "up" },
  { handle: "BlindKnight", rating: 1889, gamesPlayed: 98, trend: "flat" },
  { handle: "FileWhisperer", rating: 1801, gamesPlayed: 87, trend: "down" }
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

writePage(path.join(dist, "index.html"), renderHomePage({ rulesCount: rulesEntries.length, blogCount: blogEntries.length, homeContent: homeEntry }));
writePage(path.join(dist, "leaderboard/index.html"), renderLeaderboardPage(seedLeaderboard));
writePage(path.join(dist, "blog/index.html"), renderBlogIndex(blogEntries));
writePage(path.join(dist, "blog/archive/index.html"), renderBlogArchive(blogEntries));
writePage(path.join(dist, "changelog/index.html"), renderChangelogIndex(changelogEntries));
writePage(path.join(dist, "rules/index.html"), renderRulesPage(rulesEntries, changelogEntries));
writePage(path.join(dist, "privacy/index.html"), renderSiteMarkdownPage(privacyEntry));
writePage(path.join(dist, "terms/index.html"), renderSiteMarkdownPage(termsEntry));
writePage(path.join(dist, "404.html"), renderSimplePage("Not Found"));

for (const entry of blogEntries) writePage(path.join(dist, "blog", entry.metadata.slug, "index.html"), renderBlogDetail(entry));
for (const entry of changelogEntries) writePage(path.join(dist, "changelog", entry.metadata.slug, "index.html"), renderChangelogDetail(entry));

writeJson(path.join(dist, ".regen-manifest.json"), {
  generatedAt: new Date().toISOString(),
  sourceHash: createHash("sha256").update(JSON.stringify({ blog: blogEntries.map((e) => [e.file, e.metadata.updatedAt]), changelog: changelogEntries.map((e) => [e.file, e.metadata.updatedAt]), rules: rulesEntries.map((e) => [e.file, e.metadata.updatedAt]), site: [[homeEntry.file, homeEntry.metadata.updatedAt], [privacyEntry.file, privacyEntry.metadata.updatedAt], [termsEntry.file, termsEntry.metadata.updatedAt]] })).digest("hex"),
  blogRoutes: blogEntries.map((entry) => `/blog/${entry.metadata.slug}`),
  changelogRoutes: changelogEntries.map((entry) => `/changelog/${entry.metadata.slug}`),
  ruleRoutes: ["/rules"]
});

console.log("build complete: marketing + blog + changelog + content-owned site routes generated");

function writePage(filePath, html) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, html, "utf8"); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
