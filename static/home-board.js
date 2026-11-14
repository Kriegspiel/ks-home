(() => {
  const figure = document.querySelector('[data-home-board]');
  if (!figure) return;
  const board = figure.querySelector('[data-board]');
  const button = figure.querySelector('[data-board-toggle]');
  const prompt = button.querySelector('.ks-board-prompt');
  const announcement = figure.querySelector('[data-board-announcement]');
  const legalReplies = JSON.parse(figure.querySelector('[data-home-possibilities]').textContent);
  const blackStart = {};
  board.querySelectorAll('.ks-opponent').forEach(piece => {
    blackStart[piece.parentElement.dataset.square] = piece.dataset.piece;
  });
  // The checked-in catalogue is generated and replayed offline with python-chess.
  // It contains two legal Black replies to White's fixed e4 and Nf3.
  const possibilities = Object.entries(legalReplies).flatMap(([first, replies]) => replies.map(second => {
    const position = { ...blackStart };
    for (const move of [first, second]) {
      position[move.slice(2)] = position[move.slice(0, 2)];
      delete position[move.slice(0, 2)];
    }
    return {
      moves: [first, second], position,
      signature: Object.entries(position).sort(([a], [b]) => a.localeCompare(b)).map(([square, piece]) => square + piece).join(''),
    };
  }));
  let revealed = false;
  let possibility = null;

  button.addEventListener('click', () => {
    if (!revealed) {
      // Exclude the previous placement, including transposed move orders.
      const choices = possibilities.filter(candidate => candidate.signature !== possibility?.signature);
      possibility = choices[Math.floor(Math.random() * choices.length)];
      board.querySelectorAll('.ks-opponent').forEach(piece => piece.remove());
      for (const [square, name] of Object.entries(possibility.position)) {
        const piece = document.createElement('img');
        piece.src = `/chess/cburnett/${name}.svg`;
        piece.alt = '';
        piece.draggable = false;
        piece.width = 45;
        piece.height = 45;
        piece.dataset.piece = name;
        piece.className = 'ks-opponent';
        board.querySelector(`[data-square="${square}"]`).append(piece);
      }
      board.dataset.moves = possibility.moves.join(' ');
    }
    revealed = !revealed;
    board.dataset.revealed = String(revealed);
    button.setAttribute('aria-pressed', String(revealed));
    button.setAttribute('aria-label', revealed ? button.dataset.hideLabel : button.dataset.revealLabel);
    prompt.hidden = revealed;
    const moves = possibility.moves.map(move => `${move.slice(0, 2)} to ${move.slice(2)}`).join(', then ');
    const description = revealed
      ? `One possible position after White played e4 and Nf3, and Black played ${moves}. Activate the board again to hide Black’s pieces.`
      : 'Illustrative position after White played e4 and Nf3. Black’s pieces are hidden.';
    board.setAttribute('aria-label', description);
    announcement.textContent = description;
  });
  button.hidden = false;
})();
