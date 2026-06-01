import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("FEN board script toggles live-board square classes during interactions", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('square.classList.add("square--highlighted")'));
  assert.ok(script.includes('square.classList.remove("square--highlighted")'));
  assert.ok(script.includes('fromSquare.classList.add("square--last-move")'));
  assert.ok(script.includes('toSquare.classList.add("square--last-move")'));
  assert.ok(script.includes('square.classList.add("square--suggested")'));
  assert.ok(script.includes('square.classList.remove("square--suggested")'));
  assert.ok(script.includes('square.classList.add("square--phantom")'));
  assert.ok(script.includes('square.classList.remove("square--phantom")'));
});

test("FEN board script renders pieces with live-board class aliases", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('"fen-board__piece fen-board__piece--phantom phantom-piece-on-board"'));
  assert.ok(script.includes('"fen-board__piece piece "'));
  assert.ok(script.includes('"fen-board__piece-image phantom-piece-on-board__image"'));
  assert.ok(script.includes('"fen-board__piece-image piece__image"'));
});

test("FEN board script keeps phantoms off occupied squares", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("function canPlacePhantom(square)"));
  assert.ok(script.includes('if (!canPlacePhantom(square)) {'));
  assert.ok(script.includes('if (kind === "phantom" && !canPlacePhantom(toSquare))'));
  assert.ok(script.includes("square && canPlacePhantom(square) && PIECE_ASSETS[piece]"));
  assert.ok(script.includes("if (square.dataset.piece) square.dataset.phantomPiece = \"\";"));
});

test("FEN board script uses pointer events instead of native drag events", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('diagram.addEventListener("pointerdown", handlePointerDown)'));
  assert.ok(script.includes('diagram.addEventListener("pointermove", handlePointerMove)'));
  assert.ok(script.includes('diagram.addEventListener("pointerup", handlePointerUp)'));
  assert.ok(script.includes('diagram.addEventListener("pointercancel", handlePointerCancel)'));
  assert.ok(script.includes("function handlePointerMove(event)"));
  assert.ok(!script.includes('diagram.addEventListener("dragstart"'));
  assert.ok(!script.includes('diagram.addEventListener("dragover"'));
  assert.ok(!script.includes("event.dataTransfer.setDragImage"));
});

test("FEN board script removes pointer-dragged pieces off board", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("function handlePointerUp(event)"));
  assert.ok(script.includes("var square = squareFromPoint(diagram, event.clientX, event.clientY, pointerDrag.boardRect);"));
  assert.ok(script.includes("if (sourceSquare) removePiece(diagram, sourceSquare, pointerDrag.kind);"));
  assert.ok(script.includes("function squareFromPoint(diagram, x, y, cachedRect)"));
  assert.ok(script.includes("var target = document.elementFromPoint(x, y);"));
});

test("FEN board script suppresses synthetic clicks after pointer drags", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("function suppressNextClick(diagram)"));
  assert.ok(script.includes('diagram.dataset.fenSuppressClick = "true";'));
  assert.ok(script.includes('if (diagram.dataset.fenSuppressClick === "true") {'));
  assert.ok(script.includes("suppressNextClick(diagram);"));
});

test("FEN board script deselects instead of removing on same-square clicks", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("if (selectedSquareName === square.dataset.square) {\n        clearSelection(diagram);\n      } else {"));
  assert.ok(!script.includes("if (selectedSquareName === square.dataset.square) {\n        removePiece(square, selectedKind);"));
});

test("FEN board script lazy-initializes problem boards near the viewport", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('document.querySelectorAll("[data-fen-diagram]").forEach(scheduleDiagramInit)'));
  assert.ok(script.includes('new IntersectionObserver(handleLazyIntersections, {'));
  assert.ok(script.includes('rootMargin: "900px 0px"'));
  assert.ok(script.includes('lazyObserver.observe(diagram)'));
  assert.ok(script.includes('lazyObserver.unobserve(entry.target)'));
  assert.ok(script.includes('initDiagram(entry.target)'));
});

test("FEN board script avoids startup piece re-rendering", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("function syncSquareState(square)"));
  assert.ok(script.includes("syncSquareState(square);"));
  assert.ok(script.includes("function renderSquare(square)"));
  assert.ok(!script.includes("renderSquare(square);\n      square.addEventListener(\"click\""));
});

test("FEN board script reuses one shared phantom menu", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("var phantomMenu = null;"));
  assert.ok(script.includes("function getPhantomMenu()"));
  assert.ok(script.includes("document.body.appendChild(menu);"));
  assert.ok(script.includes("activeMenuDiagram = diagram;"));
  assert.ok(script.includes("activeMenuDiagram = null;"));
  assert.ok(!script.includes("createPhantomMenu(diagram)"));
  assert.ok(!script.includes("diagram.appendChild(menu)"));
});

test("FEN board script optimizes drag target updates", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("diagram.fenSquareMap = Object.create(null);"));
  assert.ok(script.includes("diagram.fenSquareMap[square.dataset.square] = square;"));
  assert.ok(script.includes("boardRect: readBoardRect(diagram),"));
  assert.ok(script.includes("function readBoardRect(diagram)"));
  assert.ok(script.includes("return findSquare(diagram, FEN_FILES[fileIndex] + FEN_RANKS[rankIndex]);"));
  assert.ok(script.includes("if (diagram.dataset.fenDragTargetSquare === square.dataset.square) return;"));
  assert.ok(script.includes("var previousSquare = findSquare(diagram, diagram.dataset.fenDragTargetSquare || \"\");"));
  assert.ok(script.includes("diagram.dataset.fenDragTargetSquare = square.dataset.square || \"\";"));
});

test("FEN board script moves existing piece nodes instead of recreating them", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("var movingNode = findPieceNode(fromSquare, kind);"));
  assert.ok(script.includes("function movePieceNode(fromSquare, toSquare, movingNode)"));
  assert.ok(script.includes("toSquare.appendChild(movingNode);"));
  assert.ok(script.includes("if (fromSquare === toSquare) {"));
});

test("FEN board script disables native element dragging", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("span.draggable = false;"));
  assert.ok(script.includes("image.draggable = false;"));
  assert.ok(!script.includes("function getTransparentDragImage()"));
});

test("FEN board script tracks undo and redo snapshots", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('diagram.querySelectorAll("[data-fen-undo]").forEach(function (button)'));
  assert.ok(script.includes('diagram.querySelectorAll("[data-fen-redo]").forEach(function (button)'));
  assert.ok(script.includes("stepHistory(diagram, -1);"));
  assert.ok(script.includes("stepHistory(diagram, 1);"));
  assert.ok(script.includes("function initializeHistory(diagram)"));
  assert.ok(script.includes("diagram.fenHistory = [readDiagramState(diagram)];"));
  assert.ok(script.includes("function recordHistory(diagram)"));
  assert.ok(script.includes("diagram.fenHistory = diagram.fenHistory.slice(0, index + 1);"));
  assert.ok(script.includes("function restoreDiagramState(diagram, state)"));
  assert.ok(script.includes("square.dataset.piece = entry.piece || \"\";"));
  assert.ok(script.includes("square.dataset.phantomPiece = entry.phantomPiece || \"\";"));
  assert.ok(script.includes("function updateHistoryControls(diagram)"));
  assert.ok(script.includes("button.disabled = !canUndo;"));
  assert.ok(script.includes("button.disabled = !canRedo;"));
});
