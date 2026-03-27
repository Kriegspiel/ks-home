import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadCollection, validateEntry } from "../src/content-utils.mjs";

const contentRoot = path.resolve(process.cwd(), "../content");

test("source content collections exist and pass schema", () => {
  let docs = 0;
  const issues = [];
  for (const collection of ["blog", "changelog", "rules"]) {
    for (const entry of loadCollection(contentRoot, collection)) {
      docs += 1;
      issues.push(...validateEntry(entry));
    }
  }

  assert.ok(docs > 0, "expected at least one content doc");
  assert.deepEqual(issues, []);
});
