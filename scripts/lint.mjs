import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["scripts", "src", "tests"];
const files = [];
for (const root of roots) {
  const abs = path.resolve(process.cwd(), root);
  if (!fs.existsSync(abs)) continue;
  walk(abs);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith(".mjs")) files.push(full);
  }
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`lint ok: ${files.length} files checked`);
