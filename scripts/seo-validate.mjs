import fs from "node:fs";
import path from "node:path";

const arg = process.argv.find((a) => a.startsWith("--routes="));
const routes = (arg ? arg.split("=")[1] : "/,/leaderboard,/blog,/changelog,/rules").split(",");

const requiredChecks = [
  { name: "<title>", re: /<title>[^<]+<\/title>/i },
  { name: "description", re: /<meta\s+name="description"\s+content="[^"]+"\s*\/>/i },
  { name: "canonical", re: /<link\s+rel="canonical"\s+href="[^"]+"\s*\/>/i },
  { name: "og:title", re: /<meta\s+property="og:title"\s+content="[^"]+"\s*\/>/i },
  { name: "og:image", re: /<meta\s+property="og:image"\s+content="https:\/\/kriegspiel\.org\/social-card-\d+\.png"\s*\/>/i },
  { name: "og:image:width", re: /<meta\s+property="og:image:width"\s+content="1200"\s*\/>/i },
  { name: "og:image:height", re: /<meta\s+property="og:image:height"\s+content="630"\s*\/>/i },
  { name: "twitter:title", re: /<meta\s+name="twitter:title"\s+content="[^"]+"\s*\/>/i },
  { name: "twitter:image", re: /<meta\s+name="twitter:image"\s+content="https:\/\/kriegspiel\.org\/social-card-\d+\.png"\s*\/>/i }
];

let failures = 0;
for (const route of routes) {
  const rel = route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
  const full = path.join(process.cwd(), "dist", rel);
  if (!fs.existsSync(full)) {
    console.error(`missing route html for ${route}`);
    failures += 1;
    continue;
  }
  const html = fs.readFileSync(full, "utf8");
  for (const check of requiredChecks) {
    if (!check.re.test(html)) {
      console.error(`${route}: missing ${check.name}`);
      failures += 1;
    }
  }
}

if (failures > 0) process.exit(1);
console.log(`website-seo-validate: PASS (${routes.length} routes)`);
