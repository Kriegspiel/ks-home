import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });

const arg = process.argv.find((a) => a.startsWith("--routes="));
const routes = (arg ? arg.split("=")[1] : "/,/leaderboard,/rules").split(",");
for (const route of routes) {
  const rel = route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
  assert.ok(fs.existsSync(path.join(process.cwd(), "dist", rel)), `missing route ${route}`);
}
console.log(`smoke ok: ${routes.length} routes`);
