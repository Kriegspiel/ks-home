import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes = JSON.parse(fs.readFileSync(new URL("../contracts/routes.json", import.meta.url), "utf8"));

test("required route set includes slice 910 public pages", () => {
  for (const route of ["/", "/leaderboard", "/blog", "/changelog", "/rules"]) {
    assert.ok(routes.requiredStaticRoutes.includes(route));
  }
});

test("redirect/deprecation policy uses only 308 and 410", () => {
  for (const policy of routes.deprecations) {
    assert.ok([308, 410].includes(policy.status));
    if (policy.status === 308) assert.ok(policy.to);
    if (policy.status === 410) assert.equal(policy.to, null);
  }
});
