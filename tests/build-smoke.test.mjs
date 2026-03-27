import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const distRoot = path.resolve(process.cwd(), "dist");

test("build generates required static routes", () => {
  execSync("node scripts/build.mjs", { stdio: "pipe" });
  for (const routeFile of ["index.html", "leaderboard/index.html", "blog/index.html", "changelog/index.html", "rules/index.html"]) {
    assert.ok(fs.existsSync(path.join(distRoot, routeFile)), `missing ${routeFile}`);
  }
});
