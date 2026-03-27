import fs from "node:fs";
import path from "node:path";
import { getContentRoot, loadCollection } from "../src/content-utils.mjs";
import { renderHomePage, renderLeaderboardPage, renderSimplePage } from "../src/pages.mjs";

const dist = path.resolve(process.cwd(), "dist");
const contentRoot = getContentRoot();

const blogEntries = loadCollection(contentRoot, "blog");
const changelogEntries = loadCollection(contentRoot, "changelog");
const rulesEntries = loadCollection(contentRoot, "rules");

const seedLeaderboard = [
  { handle: "RefereeFox", rating: 1968, gamesPlayed: 122, trend: "up" },
  { handle: "BlindKnight", rating: 1889, gamesPlayed: 98, trend: "flat" },
  { handle: "FileWhisperer", rating: 1801, gamesPlayed: 87, trend: "down" }
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

writePage(path.join(dist, "index.html"), renderHomePage({ rulesCount: rulesEntries.length, blogCount: blogEntries.length }));
writePage(path.join(dist, "leaderboard/index.html"), renderLeaderboardPage(seedLeaderboard));
writePage(path.join(dist, "blog/index.html"), renderSimplePage("Blog"));
writePage(path.join(dist, "changelog/index.html"), renderSimplePage("Changelog"));
writePage(path.join(dist, "rules/index.html"), renderSimplePage("Rules"));
writePage(path.join(dist, "404.html"), renderSimplePage("Not Found"));

for (const entry of blogEntries) {
  writePage(path.join(dist, "blog", entry.metadata.slug, "index.html"), renderSimplePage(entry.metadata.title));
}
for (const entry of changelogEntries) {
  writePage(path.join(dist, "changelog", entry.metadata.slug, "index.html"), renderSimplePage(entry.metadata.title));
}

function writePage(filePath, html) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, "utf8");
}

console.log("build complete: marketing + leaderboard routes generated");
