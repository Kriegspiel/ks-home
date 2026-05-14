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
