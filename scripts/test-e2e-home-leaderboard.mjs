import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const home = fs.readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf8");
const leaderboard = fs.readFileSync(path.join(process.cwd(), "dist", "leaderboard", "index.html"), "utf8");

assert.ok(home.includes('href="/leaderboard"'));
assert.ok(leaderboard.includes('id="leaderboard-table"'));
assert.ok(leaderboard.includes("fetch('/api/leaderboard'"));
assert.ok(leaderboard.includes('href="/rules"'));

console.log("e2e ok: home -> leaderboard -> rules journey present");
