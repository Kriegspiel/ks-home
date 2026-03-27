import fs from "node:fs";
import path from "node:path";

const routes = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "contracts/routes.json"), "utf8"));
const nav = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "contracts/navigation.json"), "utf8"));

const globalLinks = new Set(nav.globalNav.map((link) => link.href));
const footerLinks = new Set((nav.footerLinks || []).map((link) => link.href));

const missing = routes.requiredStaticRoutes.filter((route) => route !== "/" && !globalLinks.has(route) && !footerLinks.has(route));
if (missing.length > 0) {
  console.error("missing required routes in global/footer navigation:", missing.join(", "));
  process.exit(1);
}

for (const policy of routes.deprecations) {
  if (![308, 410].includes(policy.status)) {
    console.error(`invalid deprecation status for ${policy.from}: ${policy.status}`);
    process.exit(1);
  }
  if (policy.status === 308 && !policy.to) {
    console.error(`redirect route ${policy.from} must include target`);
    process.exit(1);
  }
  if (policy.status === 410 && policy.to !== null) {
    console.error(`410 route ${policy.from} must not include redirect target`);
    process.exit(1);
  }
}

console.log("routes-contract-check: PASS");
console.log(`required static routes: ${routes.requiredStaticRoutes.length}`);
console.log(`required dynamic routes: ${routes.requiredDynamicRoutes.length}`);
