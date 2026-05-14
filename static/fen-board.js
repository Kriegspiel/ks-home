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
  var PHANTOM_PIECES = ["K", "Q", "R", "B", "N", "P", "k", "q", "r", "b", "n", "p"];
  var activeMenu = null;

  function init() {
    document.querySelectorAll("[data-fen-diagram]").forEach(initDiagram);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("resize", closeActiveMenu);
    window.addEventListener("scroll", closeActiveMenu, true);
  }

  function initDiagram(diagram) {
    if (diagram.dataset.fenReady === "true") return;
    diagram.dataset.fenReady = "true";
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";
    diagram.dataset.fenLastMove = "";

    createPhantomMenu(diagram);
    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      renderSquare(square);
      square.addEventListener("click", function (event) {
        handleSquareClick(diagram, square, event);
      });
      square.addEventListener("contextmenu", function (event) {
        handleSquareContextMenu(diagram, square, event);
      });
    });
    diagram.querySelectorAll("[data-fen-reset]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        resetDiagram(diagram);
      });
    });
    diagram.addEventListener("dragstart", handleDragStart);
    diagram.addEventListener("dragover", handleDragOver);
    diagram.addEventListener("dragleave", handleDragLeave);
    diagram.addEventListener("drop", handleDrop);
    diagram.addEventListener("dragend", handleDragEnd);
  }

  function handleDocumentClick(event) {
    if (!activeMenu || activeMenu.contains(event.target)) return;
    closeActiveMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape") closeActiveMenu();
  }

  function handleSquareClick(diagram, square, event) {
    if (event.button && event.button !== 0) return;
    event.stopPropagation();
    closeActiveMenu();

    var selectedSquareName = diagram.dataset.fenSelectedSquare || "";
    var selectedKind = diagram.dataset.fenSelectedKind || "";
    if (selectedSquareName && selectedKind) {
      if (selectedSquareName === square.dataset.square) {
        clearSelection(diagram);
      } else {
        movePiece(diagram, selectedSquareName, square.dataset.square, selectedKind);
      }
      return;
    }

    var pieceNode = event.target.closest("[data-fen-piece]");
    var pieceKind = pieceNode && square.contains(pieceNode) ? pieceNode.dataset.fenPieceKind : "";
    if (!pieceKind) pieceKind = square.dataset.piece ? "piece" : (square.dataset.phantomPiece ? "phantom" : "");
    if (pieceKind) selectSquare(diagram, square, pieceKind);
  }

  function handleSquareContextMenu(diagram, square, event) {
    event.preventDefault();
    event.stopPropagation();
    clearSelection(diagram);

    if (square.dataset.phantomPiece) {
      square.dataset.phantomPiece = "";
      renderSquare(square);
      closeActiveMenu();
      return;
    }

    if (!canPlacePhantom(square)) {
      closeActiveMenu();
      return;
    }

    openPhantomMenu(diagram, square, event);
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
    diagram.dataset.fenDropHandled = "false";
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
    diagram.dataset.fenDropHandled = "true";
    clearDragTargets(diagram);

    var payload = readDragPayload(event);
    if (!payload.square || !payload.kind) return;
    movePiece(diagram, payload.square, square.dataset.square, payload.kind);
  }

  function handleDragEnd(event) {
    var diagram = event.currentTarget;
    var dropHandled = diagram.dataset.fenDropHandled === "true";
    delete diagram.dataset.fenDropHandled;
    clearDragTargets(diagram);

    if (dropHandled) return;
    if (isDropOutsideBoard(diagram, event)) {
      removeSelectedPiece(diagram);
      return;
    }
    clearSelection(diagram);
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
    if (kind === "phantom" && !canPlacePhantom(toSquare)) {
      clearSelection(diagram);
      return;
    }

    fromSquare.dataset[dataKey] = "";
    toSquare.dataset[dataKey] = piece;
    if (kind !== "phantom") toSquare.dataset.phantomPiece = "";
    renderSquare(fromSquare);
    renderSquare(toSquare);
    markLastMove(diagram, fromSquare, toSquare);
    clearSelection(diagram);
  }

  function removePiece(square, kind) {
    var dataKey = kind === "phantom" ? "phantomPiece" : "piece";
    square.dataset[dataKey] = "";
    renderSquare(square);
  }

  function removeSelectedPiece(diagram) {
    var selectedSquareName = diagram.dataset.fenSelectedSquare || "";
    var selectedKind = diagram.dataset.fenSelectedKind || "";
    var square = findSquare(diagram, selectedSquareName);
    if (square && selectedKind) removePiece(square, selectedKind);
    clearSelection(diagram);
  }

  function resetDiagram(diagram) {
    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      square.dataset.piece = square.dataset.initialPiece || "";
      square.dataset.phantomPiece = "";
      renderSquare(square);
    });
    clearSelection(diagram);
    clearLastMove(diagram);
    closeActiveMenu();
  }

  function createPhantomMenu(diagram) {
    var menu = document.createElement("div");
    menu.className = "fen-phantom-menu";
    menu.hidden = true;
    menu.dataset.fenPhantomMenu = "";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Add phantom piece");
    menu.innerHTML = '<div class="fen-phantom-menu__piece-grid">' + PHANTOM_PIECES.map(function (piece) {
      return [
        '<button type="button" class="fen-phantom-menu__piece-button" data-fen-phantom-choice="',
        piece,
        '" aria-label="Add phantom ',
        PIECE_LABELS[piece].toLowerCase(),
        '" role="menuitem">',
        '<span class="fen-phantom-menu__piece-symbol"><img src="/chess/cburnett/',
        PIECE_ASSETS[piece],
        '" alt="" loading="lazy" decoding="async" draggable="false" /></span>',
        "</button>"
      ].join("");
    }).join("") + "</div>";

    menu.addEventListener("click", function (event) {
      var button = event.target.closest("[data-fen-phantom-choice]");
      if (!button || !menu.contains(button)) return;
      event.stopPropagation();

      var square = findSquare(diagram, menu.dataset.fenTargetSquare || "");
      var piece = button.dataset.fenPhantomChoice || "";
      if (square && canPlacePhantom(square) && PIECE_ASSETS[piece]) {
        square.dataset.phantomPiece = piece;
        renderSquare(square);
      }
      closeActiveMenu();
    });

    diagram.appendChild(menu);
    return menu;
  }

  function openPhantomMenu(diagram, square, event) {
    if (!canPlacePhantom(square)) return;
    closeActiveMenu();
    var menu = diagram.querySelector("[data-fen-phantom-menu]");
    if (!menu) menu = createPhantomMenu(diagram);

    menu.dataset.fenTargetSquare = square.dataset.square || "";
    menu.hidden = false;
    menu.style.visibility = "hidden";
    menu.style.left = "0";
    menu.style.top = "0";

    var gap = 8;
    var rect = menu.getBoundingClientRect();
    var left = Math.min(Math.max(gap, event.clientX + gap), window.innerWidth - rect.width - gap);
    var top = Math.min(Math.max(gap, event.clientY + gap), window.innerHeight - rect.height - gap);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.visibility = "";
    activeMenu = menu;

    var firstButton = menu.querySelector("[data-fen-phantom-choice]");
    if (firstButton) firstButton.focus({ preventScroll: true });
  }

  function selectSquare(diagram, square, kind) {
    clearSelection(diagram);
    diagram.dataset.fenSelectedSquare = square.dataset.square || "";
    diagram.dataset.fenSelectedKind = kind || "piece";
    square.dataset.fenSelected = "true";
    square.classList.add("square--highlighted");
  }

  function clearSelection(diagram) {
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";
    diagram.querySelectorAll("[data-fen-selected]").forEach(function (square) {
      delete square.dataset.fenSelected;
      square.classList.remove("square--highlighted");
    });
  }

  function markLastMove(diagram, fromSquare, toSquare) {
    clearLastMove(diagram);
    fromSquare.dataset.fenLastMove = "true";
    toSquare.dataset.fenLastMove = "true";
    fromSquare.classList.add("square--last-move");
    toSquare.classList.add("square--last-move");
  }

  function clearLastMove(diagram) {
    diagram.querySelectorAll("[data-fen-last-move]").forEach(function (square) {
      delete square.dataset.fenLastMove;
      square.classList.remove("square--last-move");
    });
  }

  function markDragTarget(diagram, square) {
    diagram.querySelectorAll("[data-fen-drag-over]").forEach(function (target) {
      if (target !== square) {
        delete target.dataset.fenDragOver;
        target.classList.remove("square--suggested");
      }
    });
    square.dataset.fenDragOver = "true";
    square.classList.add("square--suggested");
  }

  function clearDragTargets(diagram) {
    diagram.querySelectorAll("[data-fen-drag-over]").forEach(function (square) {
      delete square.dataset.fenDragOver;
      square.classList.remove("square--suggested");
    });
  }

  function isDropOutsideBoard(diagram, event) {
    if (event.clientX === 0 && event.clientY === 0) return false;
    var grid = diagram.querySelector("[data-fen-grid]");
    var target = document.elementFromPoint(event.clientX, event.clientY);
    return !!grid && (!target || !grid.contains(target));
  }

  function closeActiveMenu() {
    if (!activeMenu) return;
    activeMenu.hidden = true;
    activeMenu.dataset.fenTargetSquare = "";
    activeMenu = null;
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

    if (square.dataset.piece) square.dataset.phantomPiece = "";

    if (square.dataset.phantomPiece) {
      square.appendChild(createPiece(square.dataset.phantomPiece, "phantom"));
      square.dataset.fenPhantom = "true";
      square.classList.add("square--phantom");
    } else {
      delete square.dataset.fenPhantom;
      square.classList.remove("square--phantom");
    }

    if (square.dataset.piece) square.appendChild(createPiece(square.dataset.piece, "piece"));
    square.setAttribute("aria-label", squareLabel(square));
  }

  function canPlacePhantom(square) {
    return !square.dataset.piece;
  }

  function createPiece(piece, kind) {
    var span = document.createElement("span");
    span.className = pieceClassName(piece, kind);
    span.draggable = true;
    span.dataset.fenPiece = piece;
    span.dataset.fenPieceKind = kind;

    var image = document.createElement("img");
    image.className = imageClassName(kind);
    image.src = "/chess/cburnett/" + PIECE_ASSETS[piece];
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    span.appendChild(image);
    return span;
  }

  function pieceClassName(piece, kind) {
    if (kind === "phantom") {
      return "fen-board__piece fen-board__piece--phantom phantom-piece-on-board";
    }
    return "fen-board__piece piece " + (piece === piece.toUpperCase() ? "white" : "black");
  }

  function imageClassName(kind) {
    if (kind === "phantom") return "fen-board__piece-image phantom-piece-on-board__image";
    return "fen-board__piece-image piece__image";
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
