import fs from "node:fs";
import path from "node:path";

const targets = ["/", "/blog", "/changelog", "/rules"];
let failures = 0;
for (const route of targets) {
  const rel = route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
  const full = path.join(process.cwd(), "dist", rel);
  if (!fs.existsSync(full)) {
    console.error(`missing route html for ${route}`);
    failures += 1;
    continue;
  }
  const html = fs.readFileSync(full, "utf8");
  const scripts = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) => m[1]);
  if (scripts.length === 0) {
    console.error(`${route}: no structured data scripts found`);
    failures += 1;
    continue;
  }
  for (const [idx, raw] of scripts.entries()) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed["@context"] || !parsed["@type"]) throw new Error("missing @context/@type");
    } catch (err) {
      console.error(`${route}: invalid json-ld at index ${idx}: ${err.message}`);
      failures += 1;
    }
  }
}

if (failures > 0) process.exit(1);
console.log("website-structured-data-check: PASS");
