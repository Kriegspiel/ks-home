import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import shell from "highlight.js/lib/languages/shell";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

export const REQUIRED_FIELDS = ["title", "slug", "summary", "publishedAt", "updatedAt", "author", "tags", "draft"];
export const FOLDER_ENTRY_COLLECTIONS = new Set(["blog", "site"]);

const HIGHLIGHT_LANGUAGES = [
  ["bash", bash],
  ["sh", shell],
  ["shell", shell],
  ["css", css],
  ["javascript", javascript],
  ["js", javascript],
  ["json", json],
  ["plaintext", plaintext],
  ["text", plaintext],
  ["python", python],
  ["py", python],
  ["typescript", typescript],
  ["ts", typescript],
  ["html", xml],
  ["xml", xml],
  ["yaml", yaml],
  ["yml", yaml]
];

for (const [name, language] of HIGHLIGHT_LANGUAGES) hljs.registerLanguage(name, language);

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

export function markdownToHtml(markdown, options = {}) {
  const baseDir = options.baseDir ? path.resolve(options.baseDir) : null;
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let codeFence = null;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }
    html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushCodeBlock = () => {
    if (codeFence === null) return;
    html.push(renderCodeBlock(codeLines.join("\n"), codeFence));
    codeFence = null;
    codeLines = [];
  };

  for (const rawLine of lines) {
    const fenceMatch = rawLine.match(/^```\s*([^\s`]+)?\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      if (codeFence !== null) {
        flushCodeBlock();
      } else {
        codeFence = fenceMatch[1] || "";
        codeLines = [];
      }
      continue;
    }

    if (codeFence !== null) {
      codeLines.push(rawLine);
      continue;
    }

    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const includeMatch = trimmed.match(/^::include-code\s+(.+)$/);
    if (includeMatch) {
      flushParagraph();
      flushList();
      html.push(renderIncludedCodeBlock(includeMatch[1], baseDir));
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2].trim())}</h${heading[1].length}>`);
      continue;
    }

    const unordered = trimmed.match(/^-\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unordered[1].trim());
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ordered[1].trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (codeFence !== null) flushCodeBlock();
  return html.join("\n");
}

function renderIncludedCodeBlock(argumentString, baseDir) {
  const args = parseDirectiveArgs(argumentString);
  const source = args.src || args.path || args.file;
  if (!source) throw new Error(`::include-code is missing required src/path/file argument: ${argumentString}`);
  if (!baseDir) throw new Error(`::include-code cannot resolve ${source} without a base directory`);

  const entryDir = path.resolve(baseDir);
  const resolved = path.resolve(entryDir, source);
  const relative = path.relative(entryDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`::include-code path escapes entry directory: ${source}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`::include-code source not found: ${source}`);
  }

  const language = args.lang || args.language || extToLanguage(path.extname(resolved));
  const label = args.title || args.label || path.basename(resolved);
  const code = fs.readFileSync(resolved, "utf8").replace(/\s+$/, "");
  return `<figure class="code-snippet"><figcaption>${escapeHtml(label)}</figcaption>${renderCodeBlock(code, language)}</figure>`;
}

function renderCodeBlock(source, languageHint) {
  const code = String(source || "");
  const language = normalizeHighlightLanguage(languageHint);
  const languageClass = language ? ` language-${escapeAttribute(language)}` : "";
  const highlighted = highlightCode(code, language);
  return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>`;
}

function highlightCode(code, language) {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  }
  return escapeHtml(code);
}

function normalizeHighlightLanguage(language) {
  const key = String(language || "").trim().toLowerCase();
  if (!key) return "";
  if (hljs.getLanguage(key)) return key;
  const aliases = {
    md: "plaintext",
    markdown: "plaintext",
    txt: "plaintext",
    text: "plaintext",
    zsh: "bash",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    tsx: "typescript",
    yml: "yaml",
    html: "xml"
  };
  const normalized = aliases[key] || key;
  return hljs.getLanguage(normalized) ? normalized : "";
}

function parseDirectiveArgs(argumentString) {
  const args = {};
  const pattern = /(\w+)=(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  let match;
  while ((match = pattern.exec(argumentString)) !== null) {
    args[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return args;
}

function extToLanguage(extension) {
  const key = String(extension || "").toLowerCase();
  const map = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".jsx": "jsx",
    ".json": "json",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".md": "markdown"
  };
  return map[key] || key.replace(/^\./, "");
}

function inlineMarkdown(text) {
  const tokens = [];
  const placeholder = (html) => {
    const token = `@@HTML${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  let rendered = String(text || "")
    .replace(/`([^`]+)`/g, (_, code) => placeholder(`<code>${escapeHtml(code)}</code>`))
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label, href) => placeholder(`<a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`));

  rendered = escapeHtml(rendered)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\*)([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  tokens.slice().reverse().forEach((html, offset) => {
    const index = tokens.length - offset - 1;
    rendered = rendered.replace(`@@HTML${index}@@`, html);
  });
  return rendered;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value).replace(/\s+/g, "-"));
}

export function loadCollection(contentRoot, collection) {
  const dir = path.join(contentRoot, collection);
  if (!fs.existsSync(dir)) return [];
  const includeDrafts = ["1", "true"].includes(String(process.env.KS_PREVIEW_DRAFTS).toLowerCase());
  return walkCollection(contentRoot, dir, collection, FOLDER_ENTRY_COLLECTIONS.has(collection))
    .filter((entry) => includeDrafts || entry.metadata.draft !== true)
    .sort((a, b) => String(b.metadata.publishedAt).localeCompare(String(a.metadata.publishedAt)));
}

function walkCollection(contentRoot, currentDir, collection, allowFolderEntries) {
  const entries = [];
  for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, item.name);
    if (item.isDirectory()) {
      entries.push(...walkCollection(contentRoot, fullPath, collection, allowFolderEntries));
      continue;
    }
    if (!item.isFile() || !item.name.endsWith(".md")) continue;
    if (item.name.toLowerCase() === "readme.md" && !allowFolderEntries) continue;
    const raw = fs.readFileSync(fullPath, "utf8");
    const relativePath = path.relative(path.join(contentRoot, collection), fullPath);
    const { metadata, body } = parseFrontmatter(raw);
    entries.push({ collection, file: relativePath, fullPath, metadata, body, bodyHtml: markdownToHtml(body.trim(), { baseDir: path.dirname(fullPath) }) });
  }
  return entries;
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
