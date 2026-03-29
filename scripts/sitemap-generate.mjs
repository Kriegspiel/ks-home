import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe", env: { ...process.env, KS_CONTENT_PATH: process.env.KS_CONTENT_PATH || "../content" } });
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "dist/.regen-manifest.json"), "utf8"));
const urls = ["/", "/leaderboard", "/blog", "/blog/archive", "/changelog", "/rules", ...manifest.blogRoutes, ...manifest.changelogRoutes];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>https://kriegspiel.org${u}</loc></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(process.cwd(), "dist/sitemap.xml"), xml, "utf8");
if (process.argv.includes("--check")) {
  assert.ok(xml.includes("https://kriegspiel.org/blog"));
  assert.ok(xml.includes("https://kriegspiel.org/changelog"));
}
console.log("sitemap generated");
