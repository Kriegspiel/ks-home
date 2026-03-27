import test from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, validateEntry } from "../src/content-utils.mjs";

test("parseFrontmatter parses booleans arrays and quoted values", () => {
  const raw = [
    "---",
    "title: \"Hello\"",
    "draft: false",
    "tags: [\"a\", \"b\"]",
    "---",
    "body"
  ].join("\n");
  const parsed = parseFrontmatter(raw);
  assert.equal(parsed.metadata.title, "Hello");
  assert.equal(parsed.metadata.draft, false);
  assert.deepEqual(parsed.metadata.tags, ["a", "b"]);
});

test("validateEntry reports missing version and invalid metadata shapes", () => {
  const entry = {
    collection: "rules",
    file: "sample.md",
    metadata: {
      title: "x",
      slug: "x",
      summary: "x",
      publishedAt: "not-a-date",
      updatedAt: "still-not-a-date",
      author: "me",
      tags: "not-array",
      draft: false
    }
  };
  const issues = validateEntry(entry);
  assert.ok(issues.some((i) => i.includes("missing required field version")));
  assert.ok(issues.some((i) => i.includes("tags must be an array")));
  assert.ok(issues.some((i) => i.includes("publishedAt must be a valid date")));
  assert.ok(issues.some((i) => i.includes("updatedAt must be a valid date")));
});
