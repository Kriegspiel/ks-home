import fs from "node:fs";
import path from "node:path";

export const REQUIRED_FIELDS = [
  "title",
  "slug",
  "summary",
  "publishedAt",
  "updatedAt",
  "author",
  "tags",
  "draft"
];

export function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== "---") return { metadata: {}, body: raw };

  let idx = 1;
  const metadata = {};
  for (; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line === "---") {
      idx += 1;
      break;
    }
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
    return inner.split(",").map((part) => {
      const trimmed = part.trim();
      return trimmed.replace(/^"|"$/g, "");
    });
  }
  return value.replace(/^"|"$/g, "");
}

export function loadCollection(contentRoot, collection) {
  const dir = path.join(contentRoot, collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
    .map((file) => {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const { metadata, body } = parseFrontmatter(raw);
      return { collection, file, fullPath, metadata, body };
    });
}

export function validateEntry(entry) {
  const issues = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry.metadata)) {
      issues.push(`${entry.collection}/${entry.file}: missing required field ${field}`);
    }
  }

  if (entry.collection !== "blog" && !("version" in entry.metadata)) {
    issues.push(`${entry.collection}/${entry.file}: missing required field version for ${entry.collection}`);
  }

  if (entry.metadata.tags && !Array.isArray(entry.metadata.tags)) {
    issues.push(`${entry.collection}/${entry.file}: tags must be an array`);
  }

  for (const dateField of ["publishedAt", "updatedAt"]) {
    if (entry.metadata[dateField] && Number.isNaN(Date.parse(entry.metadata[dateField]))) {
      issues.push(`${entry.collection}/${entry.file}: ${dateField} must be a valid date`);
    }
  }

  return issues;
}

export function getContentRoot() {
  return path.resolve(process.cwd(), process.env.KS_CONTENT_PATH || "../content");
}
