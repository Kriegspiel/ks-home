import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });

const routesArg = process.argv.find((a) => a.startsWith("--routes="));
const routes = (routesArg ? routesArg.split("=")[1] : "/,/leaderboard").split(",");
for (const route of routes) {
  const rel = route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
  const html = fs.readFileSync(path.join(process.cwd(), "dist", rel), "utf8");
  assert.ok(/<main>/.test(html), `${route} missing main landmark`);
  assert.ok(/<h1>/.test(html), `${route} missing h1`);
  assert.ok(/aria-label=\"Primary\"/.test(html), `${route} missing nav aria label`);
}
console.log(`a11y smoke ok: ${routes.length} routes`);
