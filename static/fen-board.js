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
  var activeMenuDiagram = null;
  var phantomMenu = null;
  var lazyObserver = null;
  var DRAG_START_DISTANCE = 4;

  function init() {
    document.querySelectorAll("[data-fen-diagram]").forEach(scheduleDiagramInit);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("resize", closeActiveMenu);
    window.addEventListener("scroll", closeActiveMenu, true);
  }

  function scheduleDiagramInit(diagram) {
    if (diagram.dataset.fenReady === "true" || diagram.dataset.fenQueued === "true") return;
    if (!("IntersectionObserver" in window)) {
      initDiagram(diagram);
      return;
    }

    diagram.dataset.fenQueued = "true";
    if (!lazyObserver) {
      lazyObserver = new IntersectionObserver(handleLazyIntersections, {
        rootMargin: "900px 0px",
        threshold: 0.01
      });
    }
    lazyObserver.observe(diagram);
  }

  function handleLazyIntersections(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) return;
      lazyObserver.unobserve(entry.target);
      initDiagram(entry.target);
    });
  }

  function initDiagram(diagram) {
    if (diagram.dataset.fenReady === "true") return;
    diagram.dataset.fenReady = "true";
    delete diagram.dataset.fenQueued;
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";
    diagram.dataset.fenLastMove = "";
    diagram.dataset.fenDragTargetSquare = "";
    diagram.fenSquareMap = Object.create(null);

    diagram.querySelectorAll("[data-fen-square]").forEach(function (square) {
      if (square.dataset.square) diagram.fenSquareMap[square.dataset.square] = square;
      syncSquareState(square);
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
    diagram.addEventListener("pointerdown", handlePointerDown);
    diagram.addEventListener("pointermove", handlePointerMove);
    diagram.addEventListener("pointerup", handlePointerUp);
    diagram.addEventListener("pointercancel", handlePointerCancel);
  }

  function handleDocumentClick(event) {
    if (!activeMenu || activeMenu.contains(event.target)) return;
    closeActiveMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape") closeActiveMenu();
  }

  function handleSquareClick(diagram, square, event) {
    if (diagram.dataset.fenSuppressClick === "true") {
      event.preventDefault();
      event.stopPropagation();
      delete diagram.dataset.fenSuppressClick;
      return;
    }
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

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    var pieceNode = event.target.closest("[data-fen-piece]");
    var square = event.target.closest("[data-fen-square]");
    var diagram = event.currentTarget;
    if (!pieceNode || !square || !diagram.contains(square)) return;

    var pointerDrag = {
      pointerId: event.pointerId,
      square: square.dataset.square || "",
      kind: pieceNode.dataset.fenPieceKind || "piece",
      startX: event.clientX,
      startY: event.clientY,
      started: false
    };
    if (!pointerDrag.square) return;

    closeActiveMenu();
    diagram.fenPointerDrag = pointerDrag;
    if (diagram.setPointerCapture) {
      try {
        diagram.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture can fail if the browser already ended the pointer.
      }
    }
  }

  function handlePointerMove(event) {
    var diagram = event.currentTarget;
    var pointerDrag = diagram.fenPointerDrag;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;

    var dx = event.clientX - pointerDrag.startX;
    var dy = event.clientY - pointerDrag.startY;
    if (!pointerDrag.started && (dx * dx + dy * dy) < DRAG_START_DISTANCE * DRAG_START_DISTANCE) return;

    event.preventDefault();
    if (!pointerDrag.started) {
      var sourceSquare = findSquare(diagram, pointerDrag.square);
      if (!sourceSquare) {
        clearPointerDrag(diagram, event.pointerId);
        return;
      }
      pointerDrag.started = true;
      diagram.dataset.fenDragging = "true";
      selectSquare(diagram, sourceSquare, pointerDrag.kind);
    }

    var square = squareFromPoint(diagram, event.clientX, event.clientY);
    if (!square) {
      clearDragTargets(diagram);
      return;
    }
    if (diagram.dataset.fenDragTargetSquare === square.dataset.square) return;
    markDragTarget(diagram, square);
  }

  function handlePointerUp(event) {
    var diagram = event.currentTarget;
    var pointerDrag = diagram.fenPointerDrag;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;

    if (!pointerDrag.started) {
      clearPointerDrag(diagram, event.pointerId);
      return;
    }

    event.preventDefault();
    suppressNextClick(diagram);
    var square = squareFromPoint(diagram, event.clientX, event.clientY);
    clearDragTargets(diagram);
    clearPointerDrag(diagram, event.pointerId);

    if (square) {
      movePiece(diagram, pointerDrag.square, square.dataset.square, pointerDrag.kind);
      return;
    }

    var sourceSquare = findSquare(diagram, pointerDrag.square);
    if (sourceSquare) removePiece(sourceSquare, pointerDrag.kind);
    clearSelection(diagram);
  }

  function handlePointerCancel(event) {
    var diagram = event.currentTarget;
    var pointerDrag = diagram.fenPointerDrag;
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    clearDragTargets(diagram);
    clearSelection(diagram);
    clearPointerDrag(diagram, event.pointerId);
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
    if (fromSquare === toSquare) {
      clearSelection(diagram);
      return;
    }
    if (kind === "phantom" && !canPlacePhantom(toSquare)) {
      clearSelection(diagram);
      return;
    }

    var movingNode = findPieceNode(fromSquare, kind);
    fromSquare.dataset[dataKey] = "";
    toSquare.dataset[dataKey] = piece;
    if (kind !== "phantom") toSquare.dataset.phantomPiece = "";
    movePieceNode(fromSquare, toSquare, movingNode);
    markLastMove(diagram, fromSquare, toSquare);
    clearSelection(diagram);
  }

  function removePiece(square, kind) {
    var dataKey = kind === "phantom" ? "phantomPiece" : "piece";
    square.dataset[dataKey] = "";
    renderSquare(square);
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

  function getPhantomMenu() {
    if (phantomMenu) return phantomMenu;

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

      var diagram = activeMenuDiagram;
      if (!diagram) {
        closeActiveMenu();
        return;
      }
      var square = findSquare(diagram, menu.dataset.fenTargetSquare || "");
      var piece = button.dataset.fenPhantomChoice || "";
      if (square && canPlacePhantom(square) && PIECE_ASSETS[piece]) {
        square.dataset.phantomPiece = piece;
        renderSquare(square);
      }
      closeActiveMenu();
    });

    document.body.appendChild(menu);
    phantomMenu = menu;
    return phantomMenu;
  }

  function openPhantomMenu(diagram, square, event) {
    if (!canPlacePhantom(square)) return;
    closeActiveMenu();
    var menu = getPhantomMenu();

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
    activeMenuDiagram = diagram;

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
    var selectedSquareName = diagram.dataset.fenSelectedSquare || "";
    diagram.dataset.fenSelectedSquare = "";
    diagram.dataset.fenSelectedKind = "";
    var selectedSquare = findSquare(diagram, selectedSquareName);
    if (!selectedSquare) {
      clearAllSelections(diagram);
      return;
    }
    delete selectedSquare.dataset.fenSelected;
    selectedSquare.classList.remove("square--highlighted");
  }

  function clearAllSelections(diagram) {
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
    var previousSquare = findSquare(diagram, diagram.dataset.fenDragTargetSquare || "");
    if (previousSquare && previousSquare !== square) {
      delete previousSquare.dataset.fenDragOver;
      previousSquare.classList.remove("square--suggested");
    }
    diagram.dataset.fenDragTargetSquare = square.dataset.square || "";
    square.dataset.fenDragOver = "true";
    square.classList.add("square--suggested");
  }

  function clearDragTargets(diagram) {
    var square = findSquare(diagram, diagram.dataset.fenDragTargetSquare || "");
    diagram.dataset.fenDragTargetSquare = "";
    if (square) {
      delete square.dataset.fenDragOver;
      square.classList.remove("square--suggested");
      return;
    }
    diagram.querySelectorAll("[data-fen-drag-over]").forEach(function (target) {
      delete target.dataset.fenDragOver;
      target.classList.remove("square--suggested");
    });
  }

  function squareFromPoint(diagram, x, y) {
    var target = document.elementFromPoint(x, y);
    var square = target && target.closest ? target.closest("[data-fen-square]") : null;
    return square && diagram.contains(square) ? square : null;
  }

  function clearPointerDrag(diagram, pointerId) {
    if (diagram.releasePointerCapture) {
      try {
        diagram.releasePointerCapture(pointerId);
      } catch (error) {
        // Release can fail after pointer cancellation; cleanup should continue.
      }
    }
    delete diagram.fenPointerDrag;
    delete diagram.dataset.fenDragging;
  }

  function suppressNextClick(diagram) {
    diagram.dataset.fenSuppressClick = "true";
    setTimeout(function () {
      if (diagram.dataset.fenSuppressClick === "true") delete diagram.dataset.fenSuppressClick;
    }, 0);
  }

  function closeActiveMenu() {
    if (!activeMenu) return;
    activeMenu.hidden = true;
    activeMenu.dataset.fenTargetSquare = "";
    activeMenu = null;
    activeMenuDiagram = null;
  }

  function findSquare(diagram, squareName) {
    if (!squareName) return null;
    if (diagram.fenSquareMap && diagram.fenSquareMap[squareName]) return diagram.fenSquareMap[squareName];
    return diagram.querySelector('[data-square="' + squareName + '"]');
  }

  function renderSquare(square) {
    square.querySelectorAll(".fen-board__piece").forEach(function (piece) {
      piece.remove();
    });

    syncSquareState(square);

    if (square.dataset.phantomPiece) {
      square.appendChild(createPiece(square.dataset.phantomPiece, "phantom"));
    }

    if (square.dataset.piece) square.appendChild(createPiece(square.dataset.piece, "piece"));
  }

  function findPieceNode(square, kind) {
    return square.querySelector('[data-fen-piece-kind="' + kind + '"]');
  }

  function movePieceNode(fromSquare, toSquare, movingNode) {
    syncSquareState(fromSquare);
    syncSquareState(toSquare);
    if (!movingNode) {
      renderSquare(fromSquare);
      renderSquare(toSquare);
      return;
    }
    toSquare.querySelectorAll(".fen-board__piece").forEach(function (piece) {
      piece.remove();
    });
    toSquare.appendChild(movingNode);
  }

  function syncSquareState(square) {
    if (square.dataset.piece) square.dataset.phantomPiece = "";

    if (square.dataset.phantomPiece) {
      square.dataset.fenPhantom = "true";
      square.classList.add("square--phantom");
    } else {
      delete square.dataset.fenPhantom;
      square.classList.remove("square--phantom");
    }

    square.setAttribute("aria-label", squareLabel(square));
  }

  function canPlacePhantom(square) {
    return !square.dataset.piece;
  }

  function createPiece(piece, kind) {
    var span = document.createElement("span");
    span.className = pieceClassName(piece, kind);
    span.draggable = false;
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
