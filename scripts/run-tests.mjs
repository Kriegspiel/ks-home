import { spawnSync } from "node:child_process";

const args = [
  "--check-coverage",
  "--lines", "80",
  "--branches", "75",
  process.execPath,
  "--test",
  "tests"
];
const result = spawnSync("c8", args, { stdio: "inherit", shell: process.platform === "win32" });
if (result.status !== 0) process.exit(result.status ?? 1);
