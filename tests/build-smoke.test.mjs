import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const distRoot = path.resolve(process.cwd(), "dist");

test("build generates required static routes", () => {
  execSync("node scripts/build.mjs", { stdio: "pipe" });
  for (const routeFile of ["index.html", "leaderboard/index.html", "blog/index.html", "blog/archive/index.html", "blog/welcome/index.html", "changelog/index.html", "changelog/2026-03-27-slice-910/index.html", "rules/index.html"]) {
    assert.ok(fs.existsSync(path.join(distRoot, routeFile)), `missing ${routeFile}`);
  }
});
