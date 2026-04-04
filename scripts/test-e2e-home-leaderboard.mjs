import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const idx = process.argv.indexOf("--grep");
const grepEq = process.argv.find((arg) => arg.startsWith("--grep="));
const grep = idx >= 0 ? process.argv[idx + 1] : (grepEq ? grepEq.split("=")[1] : "home|leaderboard");

if (/home|leaderboard/.test(grep)) {
  const home = fs.readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf8");
  const leaderboard = fs.readFileSync(path.join(process.cwd(), "dist", "leaderboard", "index.html"), "utf8");
  assert.ok(home.includes('href="/leaderboard"'));
  assert.ok(leaderboard.includes('id="leaderboard-table"'));
  assert.ok(leaderboard.includes('href="/rules"'));
}

if (/blog|changelog/.test(grep)) {
  const blog = fs.readFileSync(path.join(process.cwd(), "dist", "blog", "index.html"), "utf8");
  const changelog = fs.readFileSync(path.join(process.cwd(), "dist", "changelog", "index.html"), "utf8");
  assert.ok(blog.includes("/blog/archive"));
  assert.ok(changelog.includes("Versioned release history"));
  assert.ok(fs.existsSync(path.join(process.cwd(), "dist", "blog", "welcome", "index.html")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "dist", "changelog", "2026-03-27-slice-940-trust-discoverability", "index.html")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "dist", "changelog", "2026-04-01-v1-0-0", "index.html")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "dist", "changelog", "2026-04-02-v1-1-0", "index.html")));
}

console.log("e2e ok: " + grep);
