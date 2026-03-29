import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const REQUIRED_FIELDS = ["title", "slug", "summary", "publishedAt", "updatedAt", "author", "tags", "draft"];

export const HOME_REQUIRED_FIELDS = [
  "eyebrow", "heroTitle", "heroLede",
  "heroPrimaryCtaLabel", "heroPrimaryCtaHref", "heroSecondaryCtaLabel", "heroSecondaryCtaHref",
  "statsRulesLabel", "statsUpdatesLabel", "statsThirdLabel", "statsThirdValue",
  "flowKicker", "flowTitle", "flowIntro",
  "flowStep1Title", "flowStep1Body", "flowStep2Title", "flowStep2Body", "flowStep3Title", "flowStep3Body",
  "featuresKicker", "featuresTitle", "featuresIntro",
  "feature1Title", "feature1Body", "feature2Title", "feature2Body", "feature3Title", "feature3Body",
  "ctaKicker", "ctaTitle", "ctaBody", "ctaPrimaryLabel", "ctaPrimaryHref", "ctaSecondaryLabel", "ctaSecondaryHref",
  "trustKicker", "trustTitle", "trustRulesTitle", "trustRulesBodyTemplate", "trustUpdatesTitle", "trustUpdatesBodyTemplate"
];

export function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== "---") return { metadata: {}, body: raw };
  let idx = 1;
  const metadata = {};
  for (; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line === "---") { idx += 1; break; }
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    metadata[key] = parseValue(value);
  }
  return { metadata, body: lines.slice(idx).join("\n") };
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
  }
  return value.replace(/^"|"$/g, "");
}

export function markdownToHtml(markdown) {
  return markdown.split(/\r?\n\r?\n/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (/^##\s+/.test(trimmed)) return `<h2>${escapeHtml(trimmed.replace(/^##\s+/, ""))}</h2>`;
    if (/^#\s+/.test(trimmed)) return `<h1>${escapeHtml(trimmed.replace(/^#\s+/, ""))}</h1>`;
    if (/^-\s+/m.test(trimmed)) {
      const items = trimmed.split(/\r?\n/).filter((line) => line.startsWith("- ")).map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join("");
      return `<ul>${items}</ul>`;
    }
    return `<p>${inlineMarkdown(trimmed)}</p>`;
  }).join("\n");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function loadCollection(contentRoot, collection) {
  const dir = path.join(contentRoot, collection);
  if (!fs.existsSync(dir)) return [];
  const includeDrafts = ["1", "true"].includes(String(process.env.KS_PREVIEW_DRAFTS).toLowerCase());
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
    .map((file) => {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const { metadata, body } = parseFrontmatter(raw);
      return { collection, file, fullPath, metadata, body, bodyHtml: markdownToHtml(body.trim()) };
    })
    .filter((entry) => includeDrafts || entry.metadata.draft !== true)
    .sort((a, b) => String(b.metadata.publishedAt).localeCompare(String(a.metadata.publishedAt)));
}

export function validateEntry(entry) {
  const issues = [];
  for (const field of REQUIRED_FIELDS) if (!(field in entry.metadata)) issues.push(`${entry.collection}/${entry.file}: missing required field ${field}`);
  if (["changelog", "rules"].includes(entry.collection) && !("version" in entry.metadata)) issues.push(`${entry.collection}/${entry.file}: missing required field version for ${entry.collection}`);
  if (entry.collection === "site" && entry.metadata.slug === "home") for (const field of HOME_REQUIRED_FIELDS) if (!(field in entry.metadata)) issues.push(`${entry.collection}/${entry.file}: missing required field ${field}`);
  if (entry.metadata.tags && !Array.isArray(entry.metadata.tags)) issues.push(`${entry.collection}/${entry.file}: tags must be an array`);
  for (const dateField of ["publishedAt", "updatedAt"]) if (entry.metadata[dateField] && Number.isNaN(Date.parse(entry.metadata[dateField]))) issues.push(`${entry.collection}/${entry.file}: ${dateField} must be a valid date`);
  return issues;
}

export function getContentRoot() { return path.resolve(process.cwd(), process.env.KS_CONTENT_PATH || "../content"); }
export function readingTimeMinutes(text) { const words = text.trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.ceil(words / 220)); }
export function hashFile(filePath) { return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
export function loadSingletonEntry(contentRoot, collection, slug) {
  const entry = loadCollection(contentRoot, collection).find((candidate) => candidate.metadata.slug === slug);
  if (!entry) throw new Error(`missing required ${collection} entry with slug ${slug}`);
  return entry;
}
