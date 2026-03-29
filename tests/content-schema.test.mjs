import test from "node:test";
import assert from "node:assert/strict";
import { getContentRoot, loadCollection, validateEntry } from "../src/content-utils.mjs";

const contentRoot = getContentRoot();

test("source content collections exist and pass schema", () => {
  let docs = 0;
  const issues = [];
  for (const collection of ["blog", "changelog", "rules", "site"]) {
    for (const entry of loadCollection(contentRoot, collection)) {
      docs += 1;
      issues.push(...validateEntry(entry));
    }
  }

  assert.ok(docs > 0, "expected at least one content doc");
  assert.deepEqual(issues, []);
});
