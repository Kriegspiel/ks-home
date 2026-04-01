import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const html = fs.readFileSync(path.join(process.cwd(), "dist/blog/bot-registration-flow/index.html"), "utf8");
assert.match(html, /<figcaption>register-bot-request\.sh<\/figcaption>/);
assert.match(html, /<figcaption>register-bot-response\.json<\/figcaption>/);
assert.match(html, /<code class="hljs language-bash">/);
assert.match(html, /curl -X POST https:\/\/api\.kriegspiel\.org\/api\/auth\/bots\/register/);
assert.match(html, /<code class="hljs language-json">/);
assert.match(html, /ksbot_abcd1234\.deadbeef/);
console.log("snippet include test: ok");
