import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const contract = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "contracts/analytics-events.json"), "utf8"));
const htmlTargets = ["dist/index.html", "dist/leaderboard/index.html"];

for (const rel of htmlTargets) {
  const full = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, "utf8");
  const events = Array.from(html.matchAll(/data-telemetry-event="([^"]+)"/g)).map((m) => m[1]);
  for (const eventName of events) {
    assert.ok(contract.events[eventName], `event not in contract: ${eventName}`);
  }
}

for (const [eventName, cfg] of Object.entries(contract.events)) {
  for (const field of cfg.allowedFields) {
    assert.ok(!contract.disallowedFields.includes(field), `event ${eventName} includes disallowed field: ${field}`);
  }
}

console.log("analytics-contract-check: PASS");
console.log(`events catalogued: ${Object.keys(contract.events).length}`);
