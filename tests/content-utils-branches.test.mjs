import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getContentRoot,
  loadCollection,
  loadSingletonEntry,
  markdownToHtml,
  parseFrontmatter,
  validateEntry,
} from "../src/content-utils.mjs";

test("parseFrontmatter skips malformed lines and supports true plus empty arrays", () => {
  const raw = [
    "---",
    "ignored metadata line",
    "draft: true",
    "tags: []",
    "---",
    "body",
  ].join("\n");

  const parsed = parseFrontmatter(raw);

  assert.equal(parsed.metadata.draft, true);
  assert.deepEqual(parsed.metadata.tags, []);
  assert.equal(parsed.body, "body");
});

test("markdownToHtml handles empty input, unclosed fences, mixed lists, and short tables", () => {
  assert.equal(markdownToHtml(), "");

  const unclosedFence = markdownToHtml([
    "```",
    "plain text",
  ].join("\n"));
  assert.ok(unclosedFence.includes('<pre><code class="hljs">plain text</code></pre>'));

  const html = markdownToHtml([
    "- first item",
    "1. second item",
    "- third item",
    "",
    "| Rule | Status |",
    "| --- | --- |",
    "| Berkeley | Published |",
    "| Wild 16 |",
  ].join("\n"));

  assert.ok(html.includes("<ul><li>first item</li></ul>"));
  assert.ok(html.includes("<ol><li>second item</li></ol>"));
  assert.ok(html.includes("<ul><li>third item</li></ul>"));
  assert.ok(html.includes("<td></td>"));
});

test("markdownToHtml covers include-code aliases, unknown extensions, and guardrails", () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ks-home-include-"));

  try {
    fs.writeFileSync(path.join(fixtureDir, "plain"), "line 1\n");
    fs.writeFileSync(path.join(fixtureDir, "snippet.custom"), "<demo>\n");

    const aliasHtml = markdownToHtml(
      "::include-code path='plain' title=\"Bare file\" lang=txt",
      { baseDir: fixtureDir },
    );
    assert.ok(aliasHtml.includes("<figcaption>Bare file</figcaption>"));
    assert.ok(aliasHtml.includes('class="hljs language-plaintext"'));

    const fallbackHtml = markdownToHtml(
      "::include-code file=snippet.custom",
      { baseDir: fixtureDir },
    );
    assert.ok(fallbackHtml.includes("<figcaption>snippet.custom</figcaption>"));
    assert.ok(fallbackHtml.includes('<code class="hljs">'));
    assert.ok(fallbackHtml.includes("&lt;demo&gt;"));

    assert.throws(
      () => markdownToHtml("::include-code", { baseDir: fixtureDir }),
      /missing required src\/path\/file argument/,
    );
    assert.throws(
      () => markdownToHtml('::include-code src="plain"'),
      /cannot resolve plain without a base directory/,
    );
    assert.throws(
      () => markdownToHtml('::include-code src="../escape.sh"', { baseDir: fixtureDir }),
      /path escapes entry directory/,
    );
    assert.throws(
      () => markdownToHtml('::include-code src="missing.sh"', { baseDir: fixtureDir }),
      /source not found/,
    );
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("content helpers cover preview drafts, missing collections, env roots, and singleton errors", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ks-home-content-branches-"));
  const previousPreviewDrafts = process.env.KS_PREVIEW_DRAFTS;
  const previousContentPath = process.env.KS_CONTENT_PATH;

  try {
    assert.deepEqual(loadCollection(tempRoot, "missing"), []);

    fs.mkdirSync(path.join(tempRoot, "blog", "2026-04-01_draft"), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, "blog", "2026-04-02_live"), { recursive: true });

    fs.writeFileSync(path.join(tempRoot, "blog", "2026-04-01_draft", "README.md"), [
      "---",
      "title: \"Draft post\"",
      "slug: \"draft-post\"",
      "summary: \"Draft summary\"",
      "publishedAt: \"2026-04-01\"",
      "updatedAt: \"2026-04-01\"",
      "author: \"Team\"",
      "tags: [\"draft\"]",
      "draft: true",
      "---",
      "Draft body",
    ].join("\n"));
    fs.writeFileSync(path.join(tempRoot, "blog", "2026-04-02_live", "README.md"), [
      "---",
      "title: \"Live post\"",
      "slug: \"live-post\"",
      "summary: \"Live summary\"",
      "publishedAt: \"2026-04-02\"",
      "updatedAt: \"2026-04-02\"",
      "author: \"Team\"",
      "tags: [\"live\"]",
      "draft: false",
      "---",
      "Live body",
    ].join("\n"));

    delete process.env.KS_PREVIEW_DRAFTS;
    assert.deepEqual(loadCollection(tempRoot, "blog").map((entry) => entry.metadata.slug), ["live-post"]);

    process.env.KS_PREVIEW_DRAFTS = "true";
    assert.deepEqual(loadCollection(tempRoot, "blog").map((entry) => entry.metadata.slug), ["live-post", "draft-post"]);

    process.env.KS_CONTENT_PATH = path.join(tempRoot, "content-override");
    assert.equal(getContentRoot(), path.resolve(process.cwd(), process.env.KS_CONTENT_PATH));

    const blogIssues = validateEntry({
      collection: "blog",
      file: "missing-title.md",
      metadata: {
        slug: "missing-title",
        summary: "Missing title",
        publishedAt: "2026-04-03",
        updatedAt: "2026-04-03",
        author: "Team",
        tags: [],
        draft: false,
      },
    });
    assert.ok(blogIssues.some((issue) => issue.includes("missing required field title")));

    const homeIssues = validateEntry({
      collection: "site",
      file: "home/README.md",
      metadata: {
        title: "Home",
        slug: "home",
        summary: "Homepage summary",
        publishedAt: "2026-04-03",
        updatedAt: "2026-04-03",
        author: "Team",
        tags: [],
        draft: false,
      },
    });
    assert.ok(homeIssues.some((issue) => issue.includes("missing required field eyebrow")));

    assert.throws(
      () => loadSingletonEntry(tempRoot, "site", "missing-page"),
      /missing required site entry with slug missing-page/,
    );
  } finally {
    if (previousPreviewDrafts === undefined) delete process.env.KS_PREVIEW_DRAFTS;
    else process.env.KS_PREVIEW_DRAFTS = previousPreviewDrafts;

    if (previousContentPath === undefined) delete process.env.KS_CONTENT_PATH;
    else process.env.KS_CONTENT_PATH = previousContentPath;

    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
