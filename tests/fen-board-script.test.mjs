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

test("FEN board script removes dragged-off-board pieces", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes('diagram.addEventListener("dragend", handleDragEnd)'));
  assert.ok(script.includes('diagram.dataset.fenDropHandled = "false"'));
  assert.ok(script.includes('diagram.dataset.fenDropHandled = "true"'));
  assert.ok(script.includes("function removeSelectedPiece(diagram)"));
  assert.ok(script.includes("removeSelectedPiece(diagram);"));
  assert.ok(script.includes("document.elementFromPoint(event.clientX, event.clientY)"));
});

test("FEN board script deselects instead of removing on same-square clicks", () => {
  const script = fs.readFileSync(path.join(process.cwd(), "static", "fen-board.js"), "utf8");

  assert.ok(script.includes("if (selectedSquareName === square.dataset.square) {\n        clearSelection(diagram);\n      } else {"));
  assert.ok(!script.includes("if (selectedSquareName === square.dataset.square) {\n        removePiece(square, selectedKind);"));
});
