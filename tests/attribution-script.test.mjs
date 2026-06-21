import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('attribution script posts sanitized UTM payloads to first-party analytics endpoint', () => {
  const script = fs.readFileSync(path.join(process.cwd(), 'static', 'attribution.js'), 'utf8');

  assert.ok(script.includes('ks_attribution_last_visit_v1'));
  assert.ok(script.includes('utm_source'));
  assert.ok(script.includes('utm_campaign'));
  assert.ok(script.includes('https://app.kriegspiel.org/api/analytics/visit'));
  assert.ok(script.includes('credentials: "include"'));
  assert.ok(script.includes('referrer_host: referrerHost()'));
  assert.ok(script.includes('.replace(/[^a-zA-Z0-9_.:/@+\\-\\s]/g, "")'));
});
