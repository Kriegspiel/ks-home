import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getContentRoot, loadCollection } from "../src/content-utils.mjs";
import { buildUpdateFeedEntries, renderAtomFeed, renderRssFeed } from "../src/site-feeds.mjs";

const blog = loadCollection(getContentRoot(), "blog");
const changelog = loadCollection(getContentRoot(), "changelog");
const entries = buildUpdateFeedEntries(blog, changelog);
const rss = renderRssFeed(entries);
const atom = renderAtomFeed(entries);
fs.mkdirSync(path.join(process.cwd(), "dist"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "dist/feed.xml"), rss, "utf8");
fs.writeFileSync(path.join(process.cwd(), "dist/atom.xml"), atom, "utf8");
if (process.argv.includes("--check")) {
  assert.ok(rss.includes("<item>"));
  assert.ok(atom.includes("<entry>"));
  assert.ok(rss.includes("xmlns:atom="));
  assert.ok(atom.includes('rel="self"'));
}
console.log("feeds generated: rss + atom");
