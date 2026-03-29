import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const fromArg = process.argv.find((arg) => arg.startsWith("--from="));
const verify = process.argv.includes("--verify-static-regen");
const fromPath = fromArg ? fromArg.split("=")[1] : "../content";
assert.ok(fs.existsSync(path.resolve(process.cwd(), fromPath)), `missing content path ${fromPath}`);
execSync("node scripts/build.mjs", { stdio: "pipe", env: { ...process.env, KS_CONTENT_PATH: fromPath } });
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "dist/.regen-manifest.json"), "utf8"));
assert.ok(Array.isArray(manifest.blogRoutes));
assert.ok(Array.isArray(manifest.changelogRoutes));
if (verify) {
  assert.ok(manifest.blogRoutes.length > 0, "expected updated blog artifacts");
  assert.ok(manifest.changelogRoutes.length > 0, "expected updated changelog artifacts");
}
console.log(`content trigger simulation ok from=${fromPath} verify=${verify}`);
