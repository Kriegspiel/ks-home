import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { getContentRoot, loadCollection } from "../src/content-utils.mjs";

execSync("node scripts/build.mjs", { stdio: "pipe" });
const blog = loadCollection(getContentRoot(), "blog");
const changelog = loadCollection(getContentRoot(), "changelog");
const all = [...blog, ...changelog].sort((a, b) => String(b.metadata.publishedAt).localeCompare(String(a.metadata.publishedAt)));
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Kriegspiel Updates</title><link>https://kriegspiel.org</link>${all.map((entry) => `<item><title>${entry.metadata.title}</title><link>https://kriegspiel.org/${entry.collection}/${entry.metadata.slug}</link><pubDate>${new Date(entry.metadata.publishedAt).toUTCString()}</pubDate><description>${entry.metadata.summary}</description></item>`).join("")}</channel></rss>\n`;
const atom = `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Kriegspiel Updates</title><id>https://kriegspiel.org</id>${all.map((entry) => `<entry><title>${entry.metadata.title}</title><id>https://kriegspiel.org/${entry.collection}/${entry.metadata.slug}</id><updated>${new Date(entry.metadata.updatedAt).toISOString()}</updated><summary>${entry.metadata.summary}</summary></entry>`).join("")}</feed>\n`;
fs.writeFileSync(path.join(process.cwd(), "dist/feed.xml"), rss, "utf8");
fs.writeFileSync(path.join(process.cwd(), "dist/atom.xml"), atom, "utf8");
if (process.argv.includes("--check")) { assert.ok(rss.includes("<item>")); assert.ok(atom.includes("<entry>")); }
console.log("feeds generated: rss + atom");
