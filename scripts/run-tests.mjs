import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const read = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const lines = read("lines", "82");
const functions = read("functions", "82");
const branches = read("branches", "78");
const statements = read("statements", "82");

const c8Args = [
  "--check-coverage",
  "--lines", lines,
  "--functions", functions,
  "--branches", branches,
  "--statements", statements,
  process.execPath,
  "--test",
  "tests"
];

const result = spawnSync("c8", c8Args, { stdio: "inherit", shell: process.platform === "win32" });
if (result.status !== 0) process.exit(result.status ?? 1);
