import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCollection, markdownToHtml, parseFrontmatter, validateEntry } from "../src/content-utils.mjs";

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

test("parseFrontmatter returns plain body when frontmatter missing", () => {
  const parsed = parseFrontmatter("just body");
  assert.deepEqual(parsed.metadata, {});
  assert.equal(parsed.body, "just body");
});

test("loadCollection reads folder-based blog and site entries", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ks-home-content-"));
  fs.mkdirSync(path.join(tempRoot, "blog", "2026-03-28_demo"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "site", "privacy"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "blog", "2026-03-28_demo", "README.md"), [
    "---",
    "title: \"Demo\"",
    "slug: \"demo\"",
    "summary: \"Demo summary\"",
    "publishedAt: \"2026-03-28\"",
    "updatedAt: \"2026-03-28\"",
    "author: \"Team\"",
    "tags: [\"demo\"]",
    "draft: false",
    "lifecycle: published",
    "---",
    "Hello world"
  ].join("\n"));
  fs.writeFileSync(path.join(tempRoot, "site", "privacy", "README.md"), [
    "---",
    "title: \"Privacy\"",
    "slug: \"privacy\"",
    "summary: \"Privacy summary\"",
    "publishedAt: \"2026-03-28\"",
    "updatedAt: \"2026-03-28\"",
    "author: \"Team\"",
    "tags: [\"policy\"]",
    "draft: false",
    "---",
    "Body"
  ].join("\n"));

  const blogEntries = loadCollection(tempRoot, "blog");
  const siteEntries = loadCollection(tempRoot, "site");

  assert.equal(blogEntries.length, 1);
  assert.equal(blogEntries[0].metadata.slug, "demo");
  assert.equal(blogEntries[0].file, path.join("2026-03-28_demo", "README.md"));
  assert.equal(siteEntries.length, 1);
  assert.equal(siteEntries[0].metadata.slug, "privacy");
  assert.equal(siteEntries[0].file, path.join("privacy", "README.md"));

  fs.rmSync(tempRoot, { recursive: true, force: true });
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

test("validateEntry accepts complete blog metadata without version", () => {
  const issues = validateEntry({
    collection: "blog",
    file: "ok.md",
    metadata: {
      title: "ok",
      slug: "ok",
      summary: "ok",
      publishedAt: "2026-03-27",
      updatedAt: "2026-03-27",
      author: "team",
      tags: ["a"],
      draft: false
    }
  });
  assert.deepEqual(issues, []);
});

test("markdownToHtml renders fenced code blocks and ordered lists", () => {
  const html = markdownToHtml([
    "# Bot setup",
    "",
    "1. Register the bot",
    "2. Save the returned token",
    "",
    "```bash",
    "curl -X POST https://api.kriegspiel.org/auth/bots/register \\",
    "  -H \"Content-Type: application/json\"",
    "```"
  ].join("\n"));

  assert.ok(html.includes("<ol><li>Register the bot</li><li>Save the returned token</li></ol>"));
  assert.ok(html.includes('<pre><code class="hljs language-bash">'));
  assert.match(html, /<span class="hljs-string">&quot;Content-Type: application\/json&quot;<\/span>|Content-Type: application\/json/);
  assert.ok(html.includes("https://api.kriegspiel.org/auth/bots/register"));
});

test("markdownToHtml keeps spaced and nested ordered lists in one hierarchy", () => {
  const html = markdownToHtml([
    "1. Personnel: two players, referee, kibitzers.",
    "",
    "2. Each player has a complete chess set.",
    "",
    "3. A referee announces:",
    "",
    "   1. whose turn it is to move;",
    "",
    "   2. checks, which are announced by whichever is correct:",
    "",
    "      1. check on a long diagonal;",
    "",
    "      2. check by a knight;",
    "",
    "4. The referee does not recapitulate losses."
  ].join("\n"));

  assert.equal(
    html,
    "<ol><li>Personnel: two players, referee, kibitzers.</li><li>Each player has a complete chess set.</li><li>A referee announces:<ol><li>whose turn it is to move;</li><li>checks, which are announced by whichever is correct:<ol><li>check on a long diagonal;</li><li>check by a knight;</li></ol></li></ol></li><li>The referee does not recapitulate losses.</li></ol>",
  );
});

test("markdownToHtml preserves inline formatting without breaking links", () => {
  const html = markdownToHtml("Use **bold**, *emphasis*, `inline()` and [docs](https://kriegspiel.org/docs).");
  assert.ok(html.includes("<strong>bold</strong>"));
  assert.ok(html.includes("<em>emphasis</em>"));
  assert.ok(html.includes("<code>inline()</code>"));
  assert.ok(html.includes('<a href="https://kriegspiel.org/docs">docs</a>'));
});

test("markdownToHtml collapses solution paragraphs", () => {
  const html = markdownToHtml("Solution: The key is `1.Rg3`, threatening **mate**.");

  assert.equal(
    html,
    '<details class="solution-block"><summary>Show solution</summary><div class="solution-block__body"><p>The key is <code>1.Rg3</code>, threatening <strong>mate</strong>.</p></div></details>',
  );
});

test("markdownToHtml keeps multi-paragraph solutions inside one spoiler", () => {
  const html = markdownToHtml([
    "### 7.3.8 - G. Foster 1996",
    "",
    "Stipulation: mate in two.",
    "",
    "Solution: White must reconstruct part of Black's position.",
    "",
    "The black king can only be on a few squares.",
    "",
    "Capture cases: if the king is on a6, play `2.Rd6#`.",
    "",
    "### 7.3.9 - J. Roche 1986",
    "",
    "Stipulation: mate in two."
  ].join("\n"));

  const detailsStart = html.indexOf('<details class="solution-block">');
  const detailsEnd = html.indexOf("</details>", detailsStart);
  const nextHeading = html.indexOf("<h3>7.3.9 - J. Roche 1986</h3>");
  const detailsHtml = html.slice(detailsStart, detailsEnd);

  assert.ok(detailsStart > -1);
  assert.ok(detailsEnd > detailsStart);
  assert.ok(nextHeading > detailsEnd);
  assert.ok(detailsHtml.includes("White must reconstruct part of Black&#39;s position."));
  assert.ok(detailsHtml.includes("The black king can only be on a few squares."));
  assert.ok(detailsHtml.includes("Capture cases: if the king is on a6, play <code>2.Rd6#</code>."));
  assert.equal((html.match(/class="solution-block"/g) || []).length, 1);
});

test("markdownToHtml renders markdown tables", () => {
  const html = markdownToHtml([
    "| Repository | What it does |",
    "| --- | --- |",
    "| [`bot-random`](https://github.com/Kriegspiel/bot-random) | Minimal random bot |",
    "| [`bot-haiku`](https://github.com/Kriegspiel/bot-haiku) | Anthropic bot |"
  ].join("\n"));

  assert.ok(html.includes('<div class="table-wrap"><table>'));
  assert.ok(html.includes("<th>Repository</th>"));
  assert.ok(html.includes('<a href="https://github.com/Kriegspiel/bot-random"><code>bot-random</code></a>'));
  assert.ok(html.includes("<td>Minimal random bot</td>"));
});

test("markdownToHtml renders tier feature tables with availability marks", () => {
  const html = markdownToHtml([
    "| Feature | Tier T0 Guest (Free) | Tier T1 Casual (Free) | Tier T2 Club ($10/mo / $100/yr) |",
    "| --- | --- | --- | --- |",
    "| Play language-model bots | No | Yes | Yes |"
  ].join("\n"));

  assert.ok(html.includes('<div class="table-wrap tier-feature-table-wrap"><table class="tier-feature-table">'));
  assert.ok(html.includes('<span class="tier-feature-table__tier-label"><span class="tier-feature-table__tier-prefix">Tier</span><span class="tier-feature-table__number tier-feature-table__number--t0">T0</span></span><span class="tier-feature-table__name">Guest</span>'));
  assert.ok(html.includes('<span class="tier-feature-table__number tier-feature-table__number--t2">T2</span>'));
  assert.ok(html.includes('<span class="tier-feature-table__detail">Free</span>'));
  assert.ok(html.includes('<span class="tier-feature-table__detail">$10/mo / $100/yr</span>'));
  assert.ok(html.includes('<th scope="row">Play language-model bots</th>'));
  assert.ok(html.includes('<span class="tier-feature-table__mark tier-feature-table__mark--no">No</span>'));
  assert.ok(html.includes('<span class="tier-feature-table__mark tier-feature-table__mark--yes">Yes</span>'));
});

test("markdownToHtml renders thematic breaks as horizontal rules", () => {
  const html = markdownToHtml([
    "Before",
    "",
    "---",
    "",
    "After"
  ].join("\n"));

  assert.ok(html.includes("<p>Before</p>"));
  assert.ok(html.includes("<hr />"));
  assert.ok(html.includes("<p>After</p>"));
});

test("markdownToHtml renders Diagram FEN lines with cburnett piece assets", () => {
  const html = markdownToHtml("Diagram FEN: `8/3k4/8/8/8/8/8/4K3 w - - 0 1`");

  assert.ok(html.includes('<figure class="fen-diagram" data-fen-diagram'));
  assert.ok(html.includes('data-fen="8/3k4/8/8/8/8/8/4K3 w - - 0 1"'));
  assert.ok(html.includes('class="fen-board__square fen-board__square--'));
  assert.ok(html.includes(' square light" data-fen-square'));
  assert.ok(html.includes('data-fen-square data-square="d7" data-initial-piece="k" data-piece="k"'));
  assert.ok(html.includes('data-fen-square data-square="e1" data-initial-piece="K" data-piece="K"'));
  assert.ok(html.includes('data-phantom-piece=""'));
  assert.ok(html.includes('class="fen-board__piece piece white" draggable="false" data-fen-piece="K"'));
  assert.ok(html.includes('class="fen-board__piece-image piece__image"'));
  assert.ok(html.includes('class="fen-board__coord fen-board__coord--rank coord rank"'));
  assert.ok(html.includes('data-fen-undo aria-label="Undo board edit" disabled>&larr;</button>'));
  assert.ok(html.includes('data-fen-redo aria-label="Redo board edit" disabled>&rarr;</button>'));
  assert.ok(html.includes('data-fen-reset>Reset</button>'));
  assert.equal(html.includes('data-fen-phantom="Q"'), false);
  assert.equal(html.includes('data-fen-mode='), false);
  assert.ok(html.includes('<span class="fen-diagram__side">White to move</span>'));
  assert.ok(html.includes('src="/chess/cburnett/bK.svg"'));
  assert.ok(html.includes('src="/chess/cburnett/wK.svg"'));
  assert.ok(html.includes('aria-label="Chess diagram. white to move. White: king e1. Black: king d7."'));
  assert.ok(html.includes("<code>8/3k4/8/8/8/8/8/4K3 w - - 0 1</code>"));
});

test("markdownToHtml renders malformed Diagram FEN lines as empty boards", () => {
  const html = markdownToHtml("Diagram FEN: `x/8/8/8/8/8/8/8 b - - 0 1`");

  assert.ok(html.includes('<figure class="fen-diagram" data-fen-diagram'));
  assert.ok(html.includes('<span class="fen-diagram__side">Black to move</span>'));
  assert.ok(html.includes('aria-label="Chess diagram. black to move. empty board."'));
  assert.ok(html.includes('data-fen-square data-square="a8" data-initial-piece="" data-piece=""'));
  assert.equal(html.includes('data-initial-piece="x"'), false);
});

test("markdownToHtml highlights include-code snippets with the same renderer", () => {
  const fixtureDir = path.join(process.cwd(), "tests", "fixtures", "snippet-highlight");
  const html = markdownToHtml('::include-code src="example.sh"', { baseDir: fixtureDir });

  assert.ok(html.includes('<figure class="code-snippet">'));
  assert.ok(html.includes('<code class="hljs language-bash">'));
  assert.match(html, /<span class="hljs-built_in">echo<\/span>|<span class="hljs-keyword">echo<\/span>|echo hello/);
});
