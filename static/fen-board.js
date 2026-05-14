(function () {
  var PIECE_ASSETS = {
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
  var PIECE_LABELS = {
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

  function init() {
    document.querySelectorAll("[data-fen-diagram]").forEach(initDiagram);
  }

  function initDiagram(diagram) {
    if (diagram.dataset.fenReady === "true") return;
    diagram.dataset.fenReady = "true";
    diagram.dataset.fenMode = "move";
    diagram.dataset.fenPhantomPiece = "";
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";

    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      renderSquare(square);
      square.addEventListener("click", function (event) {
        handleSquareClick(diagram, square, event);
      });
    });
    diagram.querySelectorAll("[data-fen-reset]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        resetDiagram(diagram);
      });
    });
    diagram.querySelectorAll("[data-fen-mode]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        setMode(diagram, button.dataset.fenMode || "move", "");
      });
    });
    diagram.querySelectorAll("[data-fen-phantom]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        setMode(diagram, "phantom", button.dataset.fenPhantom || "");
      });
    });
    diagram.addEventListener("click", handleClick);
    diagram.addEventListener("dragstart", handleDragStart);
    diagram.addEventListener("dragover", handleDragOver);
    diagram.addEventListener("dragleave", handleDragLeave);
    diagram.addEventListener("drop", handleDrop);
    diagram.addEventListener("dragend", function () {
      clearDragTargets(diagram);
    });
    updateControls(diagram);
  }

  function handleClick(event) {
    var diagram = event.currentTarget;
    var resetButton = event.target.closest("[data-fen-reset]");
    if (resetButton && diagram.contains(resetButton)) {
      resetDiagram(diagram);
      return;
    }

    var modeButton = event.target.closest("[data-fen-mode]");
    if (modeButton && diagram.contains(modeButton)) {
      setMode(diagram, modeButton.dataset.fenMode || "move", "");
      return;
    }

    var phantomButton = event.target.closest("[data-fen-phantom]");
    if (phantomButton && diagram.contains(phantomButton)) {
      setMode(diagram, "phantom", phantomButton.dataset.fenPhantom || "");
      return;
    }

    var square = event.target.closest("[data-fen-square]");
    if (!square || !diagram.contains(square)) return;
    handleSquareClick(diagram, square, event);
  }

  function handleSquareClick(diagram, square, event) {
    event.stopPropagation();
    if (diagram.dataset.fenMode === "phantom") {
      if (diagram.dataset.fenPhantomPiece) {
        square.dataset.phantomPiece = diagram.dataset.fenPhantomPiece;
        renderSquare(square);
      }
      clearSelection(diagram);
      return;
    }

    if (diagram.dataset.fenMode === "erase") {
      eraseSquare(square);
      clearSelection(diagram);
      return;
    }

    var selectedSquareName = diagram.dataset.fenSelectedSquare || "";
    var selectedKind = diagram.dataset.fenSelectedKind || "";
    if (selectedSquareName && selectedKind) {
      movePiece(diagram, selectedSquareName, square.dataset.square, selectedKind);
      return;
    }

    var pieceNode = event.target.closest("[data-fen-piece]");
    var pieceKind = pieceNode && square.contains(pieceNode) ? pieceNode.dataset.fenPieceKind : "";
    if (!pieceKind) pieceKind = square.dataset.piece ? "piece" : (square.dataset.phantomPiece ? "phantom" : "");
    if (pieceKind) selectSquare(diagram, square, pieceKind);
  }

  function handleDragStart(event) {
    var pieceNode = event.target.closest("[data-fen-piece]");
    var square = event.target.closest("[data-fen-square]");
    var diagram = event.currentTarget;
    if (!pieceNode || !square || !diagram.contains(square)) return;

    var payload = {
      square: square.dataset.square || "",
      kind: pieceNode.dataset.fenPieceKind || "piece"
    };
    if (!payload.square) return;

    selectSquare(diagram, square, payload.kind);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-ks-fen-piece", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", payload.kind + ":" + payload.square);
  }

  function handleDragOver(event) {
    var diagram = event.currentTarget;
    var square = event.target.closest("[data-fen-square]");
    if (!square || !diagram.contains(square)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    markDragTarget(diagram, square);
  }

  function handleDragLeave(event) {
    var diagram = event.currentTarget;
    var nextTarget = event.relatedTarget;
    if (!nextTarget || !diagram.contains(nextTarget)) clearDragTargets(diagram);
  }

  function handleDrop(event) {
    var diagram = event.currentTarget;
    var square = event.target.closest("[data-fen-square]");
    if (!square || !diagram.contains(square)) return;
    event.preventDefault();
    clearDragTargets(diagram);

    var payload = readDragPayload(event);
    if (!payload.square || !payload.kind) return;
    movePiece(diagram, payload.square, square.dataset.square, payload.kind);
  }

  function readDragPayload(event) {
    var raw = event.dataTransfer.getData("application/x-ks-fen-piece");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return {};
      }
    }
    var fallback = event.dataTransfer.getData("text/plain").split(":");
    return { kind: fallback[0] || "", square: fallback[1] || "" };
  }

  function movePiece(diagram, fromSquareName, toSquareName, kind) {
    if (fromSquareName === toSquareName) {
      clearSelection(diagram);
      return;
    }

    var fromSquare = findSquare(diagram, fromSquareName);
    var toSquare = findSquare(diagram, toSquareName);
    if (!fromSquare || !toSquare) {
      clearSelection(diagram);
      return;
    }

    var dataKey = kind === "phantom" ? "phantomPiece" : "piece";
    var piece = fromSquare.dataset[dataKey] || "";
    if (!piece) {
      clearSelection(diagram);
      return;
    }

    fromSquare.dataset[dataKey] = "";
    toSquare.dataset[dataKey] = piece;
    renderSquare(fromSquare);
    renderSquare(toSquare);
    clearSelection(diagram);
  }

  function eraseSquare(square) {
    if (square.dataset.phantomPiece) {
      square.dataset.phantomPiece = "";
    } else {
      square.dataset.piece = "";
    }
    renderSquare(square);
  }

  function resetDiagram(diagram) {
    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      square.dataset.piece = square.dataset.initialPiece || "";
      square.dataset.phantomPiece = "";
      renderSquare(square);
    });
    setMode(diagram, "move", "");
    clearSelection(diagram);
  }

  function setMode(diagram, mode, phantomPiece) {
    diagram.dataset.fenMode = mode || "move";
    diagram.dataset.fenPhantomPiece = phantomPiece || "";
    clearSelection(diagram);
    updateControls(diagram);
  }

  function updateControls(diagram) {
    var mode = diagram.dataset.fenMode || "move";
    var phantomPiece = diagram.dataset.fenPhantomPiece || "";
    diagram.querySelectorAll("[data-fen-mode]").forEach(function (button) {
      button.setAttribute("aria-pressed", String((button.dataset.fenMode || "") === mode));
    });
    diagram.querySelectorAll("[data-fen-phantom]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(mode === "phantom" && button.dataset.fenPhantom === phantomPiece));
    });
  }

  function selectSquare(diagram, square, kind) {
    clearSelection(diagram);
    diagram.dataset.fenSelectedSquare = square.dataset.square || "";
    diagram.dataset.fenSelectedKind = kind || "piece";
    square.dataset.fenSelected = "true";
  }

  function clearSelection(diagram) {
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";
    diagram.querySelectorAll("[data-fen-selected]").forEach(function (square) {
      delete square.dataset.fenSelected;
    });
  }

  function markDragTarget(diagram, square) {
    diagram.querySelectorAll("[data-fen-drag-over]").forEach(function (target) {
      if (target !== square) delete target.dataset.fenDragOver;
    });
    square.dataset.fenDragOver = "true";
  }

  function clearDragTargets(diagram) {
    diagram.querySelectorAll("[data-fen-drag-over]").forEach(function (square) {
      delete square.dataset.fenDragOver;
    });
  }

  function findSquare(diagram, squareName) {
    var result = null;
    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      if (square.dataset.square === squareName) result = square;
    });
    return result;
  }

  function renderSquare(square) {
    square.querySelectorAll(".fen-board__piece").forEach(function (piece) {
      piece.remove();
    });
    if (square.dataset.piece) square.appendChild(createPiece(square.dataset.piece, "piece"));
    if (square.dataset.phantomPiece) square.appendChild(createPiece(square.dataset.phantomPiece, "phantom"));
    square.setAttribute("aria-label", squareLabel(square));
  }

  function createPiece(piece, kind) {
    var span = document.createElement("span");
    span.className = "fen-board__piece" + (kind === "phantom" ? " fen-board__piece--phantom" : "");
    span.draggable = true;
    span.dataset.fenPiece = piece;
    span.dataset.fenPieceKind = kind;

    var image = document.createElement("img");
    image.className = "fen-board__piece-image";
    image.src = "/chess/cburnett/" + PIECE_ASSETS[piece];
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    span.appendChild(image);
    return span;
  }

  function squareLabel(square) {
    var parts = [square.dataset.square || "square"];
    if (square.dataset.piece) parts.push(PIECE_LABELS[square.dataset.piece] || "piece");
    if (square.dataset.phantomPiece) parts.push("phantom " + (PIECE_LABELS[square.dataset.phantomPiece] || "piece").toLowerCase());
    if (parts.length === 1) parts.push("empty");
    return parts.join(": ");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
