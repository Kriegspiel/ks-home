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

const FEN_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const FEN_RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const FEN_PIECE_LABELS = {
  K: "White king",
  Q: "White queen",
  R: "White rook",
  B: "White bishop",
  N: "White knight",
  P: "White pawn",
  k: "Black king",
  q: "Black queen",
  r: "Black rook",
  b: "Black bishop",
  n: "Black knight",
  p: "Black pawn"
};
const FEN_PIECE_ASSETS = {
  K: "wK.svg",
  Q: "wQ.svg",
  R: "wR.svg",
  B: "wB.svg",
  N: "wN.svg",
  P: "wP.svg",
  k: "bK.svg",
  q: "bQ.svg",
  r: "bR.svg",
  b: "bB.svg",
  n: "bN.svg",
  p: "bP.svg"
};

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
  const renderSolutions = options.renderSolutions !== false;
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let codeFence = null;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(renderParagraph(paragraph.join(" "), { renderSolutions }));
    paragraph = [];
  };

  const flushCodeBlock = () => {
    if (codeFence === null) return;
    html.push(renderCodeBlock(codeLines.join("\n"), codeFence));
    codeFence = null;
    codeLines = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const fenceMatch = rawLine.match(/^```\s*([^\s`]+)?\s*$/);
    if (fenceMatch) {
      flushParagraph();
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
      continue;
    }

    const solutionMatch = renderSolutions ? trimmed.match(/^Solution:\s*(.*)$/i) : null;
    if (solutionMatch) {
      flushParagraph();
      const solution = collectSolutionBlock(lines, index, solutionMatch[1]);
      html.push(renderSolutionBlock(solution.markdown, options));
      index = solution.endIndex;
      continue;
    }

    const includeMatch = trimmed.match(/^::include-code\s+(.+)$/);
    if (includeMatch) {
      flushParagraph();
      html.push(renderIncludedCodeBlock(includeMatch[1], baseDir));
      continue;
    }

    const fenMatch = trimmed.match(/^Diagram FEN:\s+`([^`]+)`\s*$/i);
    if (fenMatch) {
      flushParagraph();
      html.push(renderFenDiagram(fenMatch[1]));
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2].trim())}</h${heading[1].length}>`);
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      html.push("<hr />");
      continue;
    }

    const nextTrimmed = index + 1 < lines.length ? lines[index + 1].trim() : "";
    if (trimmed.includes("|") && isMarkdownTableSeparator(nextTrimmed)) {
      flushParagraph();
      const headerCells = parseTableCells(trimmed);
      const rows = [];
      index += 1;
      while (index + 1 < lines.length) {
        const rowTrimmed = lines[index + 1].trim();
        if (!rowTrimmed || !rowTrimmed.includes("|")) break;
        rows.push(parseTableCells(rowTrimmed));
        index += 1;
      }
      html.push(renderMarkdownTable(headerCells, rows));
      continue;
    }

    if (parseListItemLine(rawLine)) {
      flushParagraph();
      const listLines = [rawLine];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        if (!nextLine.trim()) {
          index += 1;
          continue;
        }
        if (!parseListItemLine(nextLine)) break;
        listLines.push(nextLine);
        index += 1;
      }
      html.push(renderListBlock(listLines));
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  if (codeFence !== null) flushCodeBlock();
  return html.join("\n");
}

function parseListItemLine(line) {
  const normalized = String(line || "").replace(/\t/g, "    ");
  const match = normalized.match(/^(\s*)(?:(\d+)\.|([-*]))\s+(.+)$/);
  if (!match) return null;
  return {
    indent: match[1].length,
    type: match[2] ? "ol" : "ul",
    start: match[2] ? Number(match[2]) : null,
    content: match[4].trim()
  };
}

function renderListBlock(lines) {
  const rootLists = [];
  const stack = [];

  for (const line of lines) {
    const item = parseListItemLine(line);
    if (!item) continue;
    const list = resolveListForItem(rootLists, stack, item);
    list.items.push({ content: item.content, children: [] });
  }

  return rootLists.map(renderListNode).join("");
}

function resolveListForItem(rootLists, stack, item) {
  while (stack.length && item.indent < stack[stack.length - 1].indent) stack.pop();

  const current = stack[stack.length - 1];
  if (!current) return pushList(rootLists, stack, createListNode(item));
  if (item.indent > current.indent) return pushChildList(rootLists, stack, createListNode(item));
  if (item.type !== current.type) {
    stack.pop();
    return pushChildList(rootLists, stack, createListNode(item));
  }
  return current;
}

function createListNode(item) {
  return { type: item.type, indent: item.indent, start: item.start, items: [] };
}

function pushList(rootLists, stack, list) {
  rootLists.push(list);
  stack.push(list);
  return list;
}

function pushChildList(rootLists, stack, list) {
  const parent = stack[stack.length - 1];
  const parentItem = parent?.items[parent.items.length - 1];
  if (!parentItem) return pushList(rootLists, stack, list);
  parentItem.children.push(list);
  stack.push(list);
  return list;
}

function renderListNode(list) {
  const startAttribute = list.type === "ol" && list.start && list.start !== 1 ? ` start="${list.start}"` : "";
  const items = list.items
    .map((item) => `<li>${inlineMarkdown(item.content)}${item.children.map(renderListNode).join("")}</li>`)
    .join("");
  return `<${list.type}${startAttribute}>${items}</${list.type}>`;
}

function renderMarkdownTable(headerCells, rows) {
  if (isTierFeatureTable(headerCells)) return renderTierFeatureTable(headerCells, rows);

  const columnCount = headerCells.length;
  const normalize = (cells) => Array.from({ length: columnCount }, (_, index) => cells[index] || "");
  const headHtml = `<thead><tr>${normalize(headerCells).map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`;
  const bodyRows = rows
    .map((cells) => `<tr>${normalize(cells).map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap"><table>${headHtml}<tbody>${bodyRows}</tbody></table></div>`;
}

function isTierFeatureTable(headerCells) {
  if (!Array.isArray(headerCells) || headerCells.length < 3) return false;
  if (String(headerCells[0]).trim().toLowerCase() !== "feature") return false;
  return headerCells.slice(1).every((cell) => parseTierHeader(cell));
}

function parseTierHeader(cell) {
  const tier = String(cell).trim().match(/^Tier\s+(T?\d+)\s+(.+)$/i);
  if (!tier) return null;
  const tierCode = tier[1].toUpperCase().startsWith("T") ? tier[1].toUpperCase() : `T${tier[1]}`;
  const rawTierName = tier[2].trim();
  const detail = rawTierName.match(/^(.*?)\s+\(([^)]+)\)$/);
  return {
    tierCode,
    tierName: detail ? detail[1].trim() : rawTierName,
    tierDetail: detail ? detail[2].trim() : ""
  };
}

function renderTierFeatureTable(headerCells, rows) {
  const columnCount = headerCells.length;
  const normalize = (cells) => Array.from({ length: columnCount }, (_, index) => cells[index] || "");
  const normalizedHeaders = normalize(headerCells);
  const tierColumnClasses = normalizedHeaders.map((cell, index) => {
    if (index === 0) return "";
    const tier = parseTierHeader(cell);
    const tierCodeClass = tierCodeCssClass(tier?.tierCode || cell);
    const classes = ["tier-feature-table__tier-column"];
    if (tierCodeClass) classes.push(`tier-feature-table__tier-column--${tierCodeClass}`);
    if (["t5", "t6"].includes(tierCodeClass)) classes.push("tier-feature-table__tier-column--unavailable");
    return classes.join(" ");
  });
  const headHtml = `<thead><tr>${normalizedHeaders.map((cell, index) => {
    if (index === 0) return `<th scope="col">${inlineMarkdown(cell)}</th>`;
    const tier = parseTierHeader(cell);
    const tierCode = tier?.tierCode || cell;
    const tierName = tier?.tierName || "";
    const tierDetail = tier?.tierDetail || "";
    const tierCodeClass = tierCodeCssClass(tierCode);
    const tierNumberClass = ["tier-feature-table__number", tierCodeClass ? `tier-feature-table__number--${tierCodeClass}` : ""].filter(Boolean).join(" ");
    const tierColumnClass = tierColumnClasses[index] ? ` class="${tierColumnClasses[index]}"` : "";
    const detailHtml = tierDetail ? `<span class="tier-feature-table__detail">${inlineMarkdown(tierDetail)}</span>` : "";
    return `<th scope="col"${tierColumnClass}><span class="tier-feature-table__heading"><span class="tier-feature-table__tier-label"><span class="tier-feature-table__tier-prefix">Tier</span><span class="${tierNumberClass}">${inlineMarkdown(tierCode)}</span></span><span class="tier-feature-table__name">${inlineMarkdown(tierName)}</span>${detailHtml}</span></th>`;
  }).join("")}</tr></thead>`;
  const bodyRows = rows
    .map((cells) => `<tr>${renderMergedTierFeatureRow(normalize(cells), tierColumnClasses)}</tr>`)
    .join("");
  return `<div class="table-wrap tier-feature-table-wrap"><table class="tier-feature-table">${headHtml}<tbody>${bodyRows}</tbody></table></div>`;
}

function renderMergedTierFeatureRow(cells, tierColumnClasses) {
  const renderedCells = [`<th scope="row">${inlineMarkdown(cells[0])}</th>`];
  let index = 1;
  while (index < cells.length) {
    const cell = cells[index];
    const mergeKey = tierCellMergeKey(cell);
    let span = 1;
    while (mergeKey && index + span < cells.length && tierCellMergeKey(cells[index + span]) === mergeKey) span += 1;
    const cellClasses = tierColumnClasses[index] ? [tierColumnClasses[index]] : [];
    if (!isCompactAvailabilityCell(cell)) cellClasses.push("tier-feature-table__cell-text");
    const classAttribute = cellClasses.length ? ` class="${cellClasses.join(" ")}"` : "";
    const colspanAttribute = span > 1 ? ` colspan="${span}"` : "";
    renderedCells.push(`<td${classAttribute}${colspanAttribute}>${renderAvailabilityMark(cell)}</td>`);
    index += span;
  }
  return renderedCells.join("");
}

function tierCodeCssClass(tierCode) {
  return String(tierCode || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function renderAvailabilityMark(cell) {
  const value = String(cell || "").trim();
  if (/^yes$/i.test(value)) return '<span class="tier-feature-table__mark tier-feature-table__mark--yes">Yes</span>';
  if (/^no$/i.test(value)) return '<span class="tier-feature-table__mark tier-feature-table__mark--no">No</span>';
  return inlineMarkdown(value);
}

function isCompactAvailabilityCell(cell) {
  const value = String(cell || "").trim();
  return /^yes$/i.test(value) || /^no$/i.test(value) || value === "—";
}

function tierCellMergeKey(cell) {
  const value = String(cell || "").trim();
  if (!value) return "";
  if (/^yes$/i.test(value) || /^no$/i.test(value) || value === "—") return "";
  return value;
}

function isMarkdownTableSeparator(line) {
  if (!line || !line.includes("|")) return false;
  const cells = parseTableCells(line);
  if (!cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableCells(line) {
  const trimmed = String(line || "").trim();
  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutOuterPipes.split("|").map((cell) => cell.trim());
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

function renderParagraph(text, options = {}) {
  const solutionMatch = String(text || "").match(/^Solution:\s*(.*)$/i);
  if (options.renderSolutions !== false && solutionMatch) return renderSolutionBlock(solutionMatch[1], options);
  return `<p>${inlineMarkdown(text)}</p>`;
}

function collectSolutionBlock(lines, startIndex, firstLine) {
  const solutionLines = [firstLine || ""];
  let endIndex = startIndex;
  let codeFence = false;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    if (!codeFence && /^(#{1,3})\s+(.+)$/.test(trimmed)) break;

    solutionLines.push(rawLine);
    endIndex = index;
    if (/^```\s*([^\s`]+)?\s*$/.test(rawLine)) codeFence = !codeFence;
  }

  return { markdown: solutionLines.join("\n").trim(), endIndex };
}

function renderSolutionBlock(solutionMarkdown, options = {}) {
  const body = String(solutionMarkdown || "").trim();
  const bodyHtml = body ? `<div class="solution-block__body">${markdownToHtml(body, { ...options, renderSolutions: false })}</div>` : "";
  return `<details class="solution-block"><summary>Show solution</summary>${bodyHtml}</details>`;
}

function renderFenDiagram(fen) {
  const normalizedFen = String(fen || "").trim();
  const board = parseFenBoard(normalizedFen);
  const sideToMove = fenSideToMove(normalizedFen);
  const squares = board.flatMap((row, rankIndex) => row.map((piece, fileIndex) => {
    const shade = (rankIndex + fileIndex) % 2 === 0 ? "light" : "dark";
    const square = `${FEN_FILES[fileIndex]}${FEN_RANKS[rankIndex]}`;
    const rankLabel = fileIndex === 0 ? `<span class="fen-board__coord fen-board__coord--rank coord rank">${FEN_RANKS[rankIndex]}</span>` : "";
    const fileLabel = rankIndex === 7 ? `<span class="fen-board__coord fen-board__coord--file coord file">${FEN_FILES[fileIndex]}</span>` : "";
    const pieceHtml = renderFenPiece(piece, "piece");
    return `<button type="button" class="fen-board__square fen-board__square--${shade} square ${shade}" data-fen-square data-square="${square}" data-initial-piece="${piece || ""}" data-piece="${piece || ""}" data-phantom-piece="" aria-label="${escapeHtml(describeFenSquare(square, piece))}">${rankLabel}${fileLabel}${pieceHtml}</button>`;
  })).join("");

  const sideHtml = sideToMove ? `<span class="fen-diagram__side">${escapeHtml(sideToMove)}</span>` : "";
  return [
    `<figure class="fen-diagram" data-fen-diagram data-fen="${escapeHtml(normalizedFen)}">`,
    `<div class="fen-diagram__workspace">`,
    `<div class="fen-board" role="group" aria-label="${escapeHtml(describeFenBoard(board, sideToMove))}">`,
    `<div class="fen-board__grid" data-fen-grid>${squares}</div>`,
    `</div>`,
    renderFenBoardTools(),
    `</div>`,
    `<figcaption class="fen-diagram__caption">${sideHtml}<span>Diagram FEN: <code>${escapeHtml(normalizedFen)}</code></span></figcaption>`,
    `</figure>`
  ].join("");
}

function renderFenPiece(piece, kind) {
  if (!piece || !FEN_PIECE_ASSETS[piece]) return "";
  const phantomClass = kind === "phantom" ? " fen-board__piece--phantom" : "";
  const appPieceClass = kind === "phantom" ? " phantom-piece-on-board" : ` piece ${piece === piece.toUpperCase() ? "white" : "black"}`;
  const appImageClass = kind === "phantom" ? " phantom-piece-on-board__image" : " piece__image";
  return `<span class="fen-board__piece${phantomClass}${appPieceClass}" draggable="false" data-fen-piece="${piece}" data-fen-piece-kind="${kind}"><img class="fen-board__piece-image${appImageClass}" src="/chess/cburnett/${FEN_PIECE_ASSETS[piece]}" alt="" loading="lazy" decoding="async" draggable="false" /></span>`;
}

function renderFenBoardTools() {
  return `<div class="fen-board-tools" aria-label="Board tools"><button type="button" class="fen-board-tools__button fen-board-tools__history" data-fen-undo aria-label="Undo board edit" disabled>&larr;</button><button type="button" class="fen-board-tools__button fen-board-tools__history" data-fen-redo aria-label="Redo board edit" disabled>&rarr;</button><button type="button" class="fen-board-tools__button fen-board-tools__reset" data-fen-reset>Reset</button></div>`;
}

function parseFenBoard(fen) {
  const placement = String(fen || "8/8/8/8/8/8/8/8").trim().split(/\s+/)[0] || "8/8/8/8/8/8/8/8";
  const fenRanks = placement.split("/");

  return FEN_RANKS.map((_, rankIndex) => {
    const tokens = (fenRanks[rankIndex] || "8").split("");
    const row = [];

    for (const token of tokens) {
      if (token >= "1" && token <= "8") {
        row.push(...Array(Number(token)).fill(null));
      } else if (/^[prnbqkPRNBQK]$/.test(token)) {
        row.push(token);
      }
    }

    while (row.length < 8) row.push(null);
    return row.slice(0, 8);
  });
}

function fenSideToMove(fen) {
  const activeColor = String(fen || "").trim().split(/\s+/)[1];
  if (activeColor === "w") return "White to move";
  if (activeColor === "b") return "Black to move";
  return "";
}

function describeFenBoard(board, sideToMove) {
  const white = [];
  const black = [];
  board.forEach((row, rankIndex) => row.forEach((piece, fileIndex) => {
    if (!piece || !FEN_PIECE_LABELS[piece]) return;
    const label = FEN_PIECE_LABELS[piece];
    const square = `${FEN_FILES[fileIndex]}${FEN_RANKS[rankIndex]}`;
    const entry = `${label.replace(/^White /, "").replace(/^Black /, "")} ${square}`;
    if (piece === piece.toUpperCase()) white.push(entry);
    else black.push(entry);
  }));

  const parts = ["Chess diagram"];
  if (sideToMove) parts.push(sideToMove.toLowerCase());
  if (white.length) parts.push(`White: ${white.join(", ")}`);
  if (black.length) parts.push(`Black: ${black.join(", ")}`);
  if (!white.length && !black.length) parts.push("empty board");
  return `${parts.join(". ")}.`;
}

function describeFenSquare(square, piece) {
  if (piece && FEN_PIECE_LABELS[piece]) return `${square}: ${FEN_PIECE_LABELS[piece]}`;
  return `${square}: empty`;
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
    .replace(/<br\s*\/?>/gi, () => placeholder("<br />"))
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

function defaultContentRoot() {
  return path.resolve(process.cwd(), "../ks-content");
}

export function getContentRoot() { return path.resolve(process.cwd(), process.env.KS_CONTENT_PATH || defaultContentRoot()); }
export function readingTimeMinutes(text) { const words = text.trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.ceil(words / 220)); }
export function hashFile(filePath) { return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
export function loadSingletonEntry(contentRoot, collection, slug) {
  const entry = loadCollection(contentRoot, collection).find((candidate) => candidate.metadata.slug === slug);
  if (!entry) throw new Error(`missing required ${collection} entry with slug ${slug}`);
  return entry;
}
