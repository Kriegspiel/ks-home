import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const blog = fs.readFileSync(path.join(process.cwd(), "dist/blog/index.html"), "utf8");
const changelog = fs.readFileSync(path.join(process.cwd(), "dist/changelog/index.html"), "utf8");
assert.ok(blog.includes("/blog/archive"));
assert.ok(blog.includes("min read"));
assert.ok(changelog.includes("Versioned release history"));
for (const route of ["dist/blog/welcome/index.html", "dist/changelog/2026-03-27-slice-910/index.html"]) {
  assert.ok(fs.existsSync(path.join(process.cwd(), route)), `missing detail route ${route}`);
}
console.log("e2e ok: blog + changelog routes and linking");
