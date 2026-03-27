import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contract = JSON.parse(fs.readFileSync(new URL("../contracts/leaderboard-contract.json", import.meta.url), "utf8"));

test("leaderboard contract documents endpoint and required fields", () => {
  assert.equal(contract.endpoint, "/api/leaderboard");
  assert.ok(contract.requiredTopLevelFields.includes("players"));
  assert.equal(contract.cachePolicy.request, "no-store");
});
