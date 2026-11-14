import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../static/fen-board.js", import.meta.url), "utf8");

// Model only the DOM operations used by the controller. Browser QA additionally
// checks native pointer capture, touch gestures, piece placement, and layering.
class Element {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.className = "";
    this.listeners = new Map();
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(" "); },
      contains: name => this.className.split(/\s+/).includes(name),
    };
  }
  appendChild(child) {
    child.remove();
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  matches(selector) {
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    const attribute = selector.match(/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/);
    if (!attribute) return this.tag === selector;
    const key = attribute[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return attribute[2] === undefined ? key in this.dataset : this.dataset[key] === attribute[2];
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }
  emit(type, properties = {}) {
    const event = {
      currentTarget: this, target: this, button: 0, pointerId: 1, isPrimary: true,
      clientX: 0, clientY: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...properties,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 34, height: 34 }; }
  setPointerCapture(id) { this.capturedPointer = id; }
  releasePointerCapture(id) {
    if (this.capturedPointer !== id) return;
    this.capturedPointer = null;
    this.emit("lostpointercapture", { pointerId: id });
  }
}

function fixture() {
  const document = new Element("document");
  document.readyState = "complete";
  document.body = document.appendChild(new Element("body"));
  document.createElement = tag => new Element(tag);
  document.elementFromPoint = () => null;
  const window = new Element("window");
  const timers = [];
  const diagrams = [0, 1].map(index => {
    const diagram = document.body.appendChild(new Element());
    diagram.dataset.fenDiagram = "";
    const grid = diagram.appendChild(new Element());
    grid.dataset.fenGrid = "";
    grid.rect = { left: 100 + index * 400, top: 150, width: 320, height: 320 };
    const squares = new Map();
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const name = "abcdefgh"[col] + (8 - row);
        const square = grid.appendChild(new Element("button"));
        square.dataset = { fenSquare: "", square: name, piece: name === "e2" ? "P" : name === "d4" ? "r" : "", phantomPiece: name === "c3" ? "N" : "" };
        square.dataset.initialPiece = square.dataset.piece;
        square.rect = { left: grid.rect.left + col * 40, top: grid.rect.top + row * 40, width: 40, height: 40 };
        if (square.dataset.piece || square.dataset.phantomPiece) {
          const piece = square.appendChild(new Element("span"));
          piece.className = "fen-board__piece";
          piece.dataset = { fenPiece: square.dataset.piece || square.dataset.phantomPiece, fenPieceKind: square.dataset.piece ? "piece" : "phantom" };
          piece.appendChild(new Element("img"));
        }
        squares.set(name, square);
      }
    }
    const controls = Object.fromEntries(["reset", "undo", "redo"].map(action => {
      const button = diagram.appendChild(new Element("button"));
      button.dataset[`fen${action[0].toUpperCase()}${action.slice(1)}`] = "";
      return [action, button];
    }));
    const point = name => {
      const rect = squares.get(name).rect;
      return { clientX: rect.left + 20, clientY: rect.top + 20 };
    };
    const piece = name => squares.get(name).querySelector("[data-fen-piece]");
    const down = (name = "e2", properties = {}) => diagram.emit("pointerdown", { target: piece(name), ...point(name), ...properties });
    const move = (name = "e4", properties = {}) => diagram.emit("pointermove", { ...point(name), ...properties });
    const up = (name = "e4", properties = {}) => diagram.emit("pointerup", { ...point(name), ...properties });
    return { diagram, grid, squares, controls, point, piece, down, move, up };
  });
  runInNewContext(source, { document, window, setTimeout: callback => timers.push(callback) });
  return {
    document, window, diagrams,
    previews: () => document.querySelectorAll(".fen-drag-preview"),
    flushClicks: () => { while (timers.length) timers.shift()(); },
  };
}

function assertClean(fixture, board) {
  assert.equal(fixture.previews().length, 0);
  assert.equal(board.diagram.fenPointerDrag, undefined);
  assert.equal(board.diagram.dataset.fenDragging, undefined);
  assert.equal(board.diagram.dataset.fenDragTargetSquare, "");
  assert.equal(board.diagram.querySelectorAll("[data-fen-drag-source]").length, 0);
  assert.equal(board.diagram.querySelectorAll("[data-fen-drag-over]").length, 0);
}

test("small pointer movements retain click selection without a preview or a history entry", () => {
  const view = fixture();
  const board = view.diagrams[0];
  board.down();
  board.move("e2", { clientX: board.point("e2").clientX + 3 });
  assert.equal(view.previews().length, 0);
  board.up("e2");
  board.squares.get("e2").emit("click", { target: board.piece("e2") });
  assert.equal(board.diagram.dataset.fenSelectedSquare, "e2");
  board.squares.get("e4").emit("click");
  assert.equal(board.squares.get("e4").dataset.piece, "P");
  assert.equal(board.diagram.fenHistory.length, 2);
  assertClean(view, board);
});

test("the same piece follows every move, including movement within one target square, before committing a drop", () => {
  const view = fixture();
  const board = view.diagrams[0];
  const original = board.piece("e2");
  board.down();
  board.move();
  const [preview] = view.previews();
  assert.equal(preview.querySelector("img").src, "/chess/cburnett/wP.svg");
  assert.equal(preview.attributes["aria-hidden"], "true");
  assert.equal(preview.style.width, "34px");
  assert.equal(preview.style.height, "34px");
  assert.equal(original.dataset.fenDragSource, "true");
  assert.equal(board.squares.get("e2").dataset.piece, "P");
  assert.equal(board.diagram.fenHistory.length, 1);
  const { clientX, clientY } = board.point("e4");
  board.move("e4", { clientX: clientX + 5, clientY: clientY + 2 });
  assert.equal(preview.style.transform, `translate3d(${clientX + 5}px, ${clientY + 2}px, 0) translate(-50%, -50%)`);
  assert.equal(view.previews()[0], preview);
  assert.equal(board.squares.get("e4").dataset.fenDragOver, "true");
  board.up();
  assertClean(view, board);
  assert.equal(board.squares.get("e2").dataset.piece, "");
  assert.equal(board.piece("e4"), original);
  assert.equal(board.diagram.fenHistory.length, 2);
  board.squares.get("e4").emit("click");
  assert.equal(board.diagram.dataset.fenSelectedSquare, "");
  board.controls.undo.emit("click");
  assert.equal(board.squares.get("e2").dataset.piece, "P");
  board.controls.redo.emit("click");
  assert.equal(board.squares.get("e4").dataset.piece, "P");
  board.controls.reset.emit("click");
  assert.equal(board.squares.get("e2").dataset.piece, "P");
  assert.equal(board.diagram.fenHistory.length, 1);
});

for (const cancellation of ["pointercancel", "lostpointercapture", "Escape", "blur", "resize", "scroll"]) {
  test(`${cancellation} removes the preview and restores the source without moving or deleting it`, () => {
    const view = fixture();
    const board = view.diagrams[0];
    board.down();
    board.move();
    board.up();
    view.flushClicks();
    const historyBefore = JSON.stringify(board.diagram.fenHistory);
    board.down("e4");
    board.move("e5");
    if (cancellation === "Escape") view.document.emit("keydown", { key: "Escape" });
    else if (["blur", "resize", "scroll"].includes(cancellation)) view.window.emit(cancellation);
    else board.diagram.emit(cancellation);
    assertClean(view, board);
    assert.equal(board.squares.get("e4").dataset.piece, "P");
    assert.equal(board.squares.get("e5").dataset.piece, "");
    assert.equal(JSON.stringify(board.diagram.fenHistory), historyBefore);
    assert.equal(board.diagram.fenHistoryIndex, 1);
    board.up("e5");
    assert.equal(board.squares.get("e4").dataset.piece, "P");
    board.controls.undo.emit("click");
    assert.equal(board.squares.get("e2").dataset.piece, "P");
    view.flushClicks();
    board.down();
    board.move();
    assert.equal(view.previews().length, 1);
  });
}

test("same-square drops do nothing and outside drops retain removal plus undo", () => {
  const view = fixture();
  const board = view.diagrams[0];
  board.down();
  board.move();
  board.move("e2");
  assert.equal(board.diagram.dataset.fenDragTargetSquare, "");
  board.up("e2");
  assertClean(view, board);
  assert.equal(board.diagram.fenHistory.length, 1);
  view.flushClicks();
  board.down();
  board.move("e4", { clientX: 20, clientY: 20 });
  assert.equal(board.diagram.dataset.fenDragTargetSquare, "");
  assert.match(view.previews()[0].style.transform, /translate3d\(20px, 20px/);
  board.up("e4", { clientX: 20, clientY: 20 });
  assertClean(view, board);
  assert.equal(board.squares.get("e2").dataset.piece, "");
  board.controls.undo.emit("click");
  assert.equal(board.squares.get("e2").dataset.piece, "P");
});

test("phantom previews retain their styling and moved phantoms capture real pieces", () => {
  const view = fixture();
  const board = view.diagrams[0];
  board.down("c3");
  board.move("d4");
  const [preview] = view.previews();
  assert.equal(preview.classList.contains("fen-board__piece--phantom"), true);
  assert.equal(preview.querySelector("img").src, "/chess/cburnett/wN.svg");
  board.up("d4");
  assertClean(view, board);
  assert.equal(board.squares.get("c3").dataset.phantomPiece, "");
  assert.equal(board.squares.get("d4").dataset.piece, "");
  assert.equal(board.squares.get("d4").dataset.phantomPiece, "N");
  board.controls.undo.emit("click");
  assert.equal(board.squares.get("d4").dataset.piece, "r");
  assert.equal(board.squares.get("c3").dataset.phantomPiece, "N");
});

test("secondary pointers and other diagrams cannot take over an active drag", () => {
  const view = fixture();
  const [board, other] = view.diagrams;
  board.down("e2", { isPrimary: false, pointerId: 2 });
  assert.equal(board.diagram.fenPointerDrag, undefined);
  board.down();
  board.move();
  const [preview] = view.previews();
  const transform = preview.style.transform;
  board.move("d4", { pointerId: 2 });
  board.diagram.emit("pointercancel", { pointerId: 2 });
  other.down("e2", { pointerId: 2 });
  assert.equal(preview.style.transform, transform);
  assert.equal(view.previews().length, 1);
  assert.equal(other.diagram.fenPointerDrag, undefined);
  board.up();
  other.down();
  other.move();
  other.up();
  assert.equal(board.squares.get("e4").dataset.piece, "P");
  assert.equal(other.squares.get("e4").dataset.piece, "P");
  assertClean(view, other);
});

for (const action of ["reset", "undo", "redo"]) {
  test(`${action} cancels an unfinished drag before applying history`, () => {
    const view = fixture();
    const board = view.diagrams[0];
    board.down();
    board.move();
    board.up();
    view.flushClicks();
    if (action === "redo") board.controls.undo.emit("click");
    const start = action === "redo" ? "e2" : "e4";
    board.down(start);
    board.move("e5");
    board.controls[action].emit("click");
    assertClean(view, board);
    board.up("e5");
    assert.equal(board.squares.get("e5").dataset.piece, "");
    assert.equal(board.squares.get(action === "redo" ? "e4" : "e2").dataset.piece, "P");
  });
}

test("drag feedback is pointer transparent, below the header, and only hides the source during dragging", () => {
  const styles = readFileSync(new URL("../src/pages.mjs", import.meta.url), "utf8");
  assert.match(styles, /\.fen-board__piece\[data-fen-drag-source="true"\]\{visibility:hidden;\}/);
  assert.match(styles, /\.fen-board__piece\.fen-drag-preview\{[^}]*position:fixed;[^}]*z-index:9;[^}]*pointer-events:none;/);
});
