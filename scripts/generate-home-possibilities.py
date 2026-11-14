#!/usr/bin/env python3
"""Generate offline illustration data; python-chess is not a browser dependency."""

import argparse
import json
from pathlib import Path

try:
    import chess
except ModuleNotFoundError as error:
    raise SystemExit(
        "Run this development tool with the existing ks-game/.venv/bin/python "
        "environment, which includes python-chess."
    ) from error


CATALOGUE_PATH = Path(__file__).resolve().parents[1] / "src" / "home-possibilities.json"
WHITE_POSITION = {
    "a1": "R", "b1": "N", "c1": "B", "d1": "Q", "e1": "K", "f1": "B", "h1": "R",
    "a2": "P", "b2": "P", "c2": "P", "d2": "P", "f2": "P", "g2": "P", "h2": "P",
    "e4": "P", "f3": "N",
}


def play_legal(board, uci):
    move = chess.Move.from_uci(uci)
    if move not in board.legal_moves:
        raise ValueError(f"Illegal move {uci} in {board.fen()}")
    board.push(move)


def generate_catalogue():
    """Enumerate 1.e4 ... 2.Nf3 ... without capturing the visible White pieces."""
    board = chess.Board()
    play_legal(board, "e2e4")
    catalogue = {}
    for first in sorted(board.legal_moves, key=lambda move: move.uci()):
        board.push(first)
        play_legal(board, "g1f3")
        catalogue[first.uci()] = sorted(
            move.uci() for move in board.legal_moves if not board.is_capture(move)
        )
        board.pop()
        board.pop()
    return catalogue


def validate_catalogue(catalogue):
    """Independently replay every sequence and verify the illustration invariants."""
    positions = set()
    sequences = 0
    for first, replies in catalogue.items():
        if not replies or len(replies) != len(set(replies)):
            raise ValueError(f"Empty or duplicated reply list for {first}")
        for second in replies:
            board = chess.Board()
            for uci in ("e2e4", first, "g1f3", second):
                play_legal(board, uci)
            white = {
                chess.square_name(square): piece.symbol()
                for square, piece in board.piece_map().items()
                if piece.color == chess.WHITE
            }
            black = {
                chess.square_name(square): piece.symbol()
                for square, piece in board.piece_map().items()
                if piece.color == chess.BLACK
            }
            if white != WHITE_POSITION:
                raise ValueError(f"White's visible pieces changed after {first}, {second}")
            if len(black) != 16:
                raise ValueError(f"Black must retain 16 pieces after {first}, {second}")
            if board.turn != chess.WHITE or not board.is_valid():
                raise ValueError(f"Invalid final position after {first}, {second}")
            positions.add(tuple(sorted(black.items())))
            sequences += 1
    return sequences, len(positions)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true",
        help="Validate the checked-in catalogue without writing it.",
    )
    args = parser.parse_args()
    expected = generate_catalogue()
    if args.check:
        try:
            catalogue = json.loads(CATALOGUE_PATH.read_text())
        except (OSError, ValueError) as error:
            parser.error(f"Cannot read {CATALOGUE_PATH.name}: {error}")
        if catalogue != expected:
            parser.error("home-possibilities.json differs from the exhaustive legal opening tree")
    else:
        catalogue = expected
    sequences, positions = validate_catalogue(catalogue)
    if not args.check:
        CATALOGUE_PATH.write_text(json.dumps(catalogue, separators=(",", ":")) + "\n")
    action = "Validated" if args.check else "Generated"
    print(
        f"{action} {CATALOGUE_PATH.name}: {len(catalogue)} first moves, "
        f"{sequences} legal sequences, {positions} distinct Black positions; "
        "White's pieces stay fixed and Black retains 16 pieces."
    )


if __name__ == "__main__":
    main()
