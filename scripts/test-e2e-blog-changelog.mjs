import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const blog = fs.readFileSync(path.join(process.cwd(), "dist/blog/index.html"), "utf8");
const changelog = fs.readFileSync(path.join(process.cwd(), "dist/changelog/index.html"), "utf8");
const distDir = path.join(process.cwd(), "dist");
assert.ok(blog.includes("/blog/archive"));
assert.ok(blog.includes("min read"));
assert.ok(changelog.includes("Versioned release history"));
assert.match(blog, /<link rel="icon" href="https:\/\/kriegspiel\.org\/favicon\.ico\?v=ks-org-20260330" sizes="any" \/>/);
assert.match(blog, /<link rel="shortcut icon" href="https:\/\/kriegspiel\.org\/favicon\.ico\?v=ks-org-20260330" \/>/);
assert.match(changelog, /<link rel="shortcut icon" href="https:\/\/kriegspiel\.org\/favicon\.ico\?v=ks-org-20260330" \/>/);
assert.equal(fs.existsSync(path.join(distDir, 'blog', 'favicon.ico')), true);
assert.equal(fs.existsSync(path.join(distDir, 'blog', 'favicon-32x32.png')), true);
assert.equal(fs.existsSync(path.join(distDir, 'blog', 'archive', 'favicon.ico')), true);
assert.equal(fs.existsSync(path.join(distDir, 'changelog', 'favicon.ico')), true);
assert.match(changelog, /<link rel="manifest" href="https:\/\/kriegspiel\.org\/site\.webmanifest\?v=ks-org-20260330" \/>/);
for (const route of ["dist/blog/welcome/index.html", "dist/changelog/2026-03-27-slice-940-trust-discoverability/index.html", "dist/changelog/2026-04-01-v1-0-0/index.html", "dist/changelog/2026-04-02-v1-1-0/index.html", "dist/changelog/2026-04-04-v1-2-0/index.html"]) {
  assert.ok(fs.existsSync(path.join(process.cwd(), route)), `missing detail route ${route}`);
}
console.log("e2e ok: blog + changelog routes and linking");
