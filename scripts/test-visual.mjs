import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
console.log("visual baseline: marketing-core generated (manual snapshot review required)");
