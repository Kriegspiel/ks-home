import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { renderHomeDesign } from '../src/home-design.mjs';

const source = readFileSync(new URL('../static/home-board.js', import.meta.url), 'utf8');
const markup = renderHomeDesign();
const catalogueText = markup.match(/<script type="application\/json" data-home-possibilities>(.*?)<\/script>/s)[1];
const catalogue = JSON.parse(catalogueText);
const sequences = Object.entries(catalogue).flatMap(([first, replies]) => replies.map(second => [first, second]));

// Only the DOM operations used by the board are modelled here. The real browser
// checks exercise the native button, focus, keyboard activation, and styling.
function createBoard(random = () => 0) {
  const squares = new Map();
  const makePiece = () => ({
    dataset: {},
    remove() {
      this.parentElement.pieces.splice(this.parentElement.pieces.indexOf(this), 1);
    },
  });
  for (const [, squareName, contents] of markup.matchAll(/<div class="ks-square[^"]*" data-square="([a-h][1-8])" aria-hidden="true">(.*?)<\/div>/gs)) {
    const square = {
      dataset: { square: squareName }, pieces: [],
      append(piece) { piece.parentElement = this; this.pieces.push(piece); },
    };
    for (const [, name] of contents.matchAll(/data-piece="([wb][KQRBNP])"/g)) {
      const piece = makePiece();
      piece.dataset.piece = name;
      piece.className = name[0] === 'b' ? 'ks-opponent' : '';
      square.append(piece);
    }
    squares.set(squareName, square);
  }
  const attributes = {};
  const board = {
    dataset: { revealed: 'false' },
    setAttribute(name, value) { attributes[name] = value; },
    querySelectorAll() { return [...squares.values()].flatMap(square => square.pieces).filter(piece => piece.className === 'ks-opponent'); },
    querySelector(selector) { return squares.get(selector.match(/data-square="([a-h][1-8])"/)[1]); },
  };
  const prompt = { hidden: false };
  const announcement = { textContent: '' };
  const button = {
    hidden: true,
    dataset: { revealLabel: 'Reveal the possibility', hideLabel: 'Hide this possibility' },
    attributes: {},
    querySelector() { return prompt; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { assert.equal(type, 'click'); this.click = listener; },
  };
  const elements = {
    '[data-board]': board,
    '[data-board-toggle]': button,
    '[data-board-announcement]': announcement,
    '[data-home-possibilities]': { textContent: catalogueText },
  };
  runInNewContext(source, {
    document: {
      querySelector: () => ({ querySelector: selector => elements[selector] }),
      createElement: tag => { assert.equal(tag, 'img'); return makePiece(); },
    },
    Math: { floor: Math.floor, random },
  });
  const position = color => Object.fromEntries([...squares].flatMap(([square, { pieces }]) => pieces.filter(piece => piece.dataset.piece.startsWith(color)).map(piece => [square, piece.dataset.piece])));
  return { squares, board, button, prompt, announcement, attributes, position };
}

test('home board is rendered before JavaScript and its control is progressively enabled', () => {
  assert.equal((markup.match(/data-square=/g) || []).length, 64);
  assert.equal((markup.match(/data-piece="w/g) || []).length, 16);
  assert.equal((markup.match(/data-piece="b/g) || []).length, 16);
  assert.match(markup, /data-board-toggle type="button"[^>]*aria-controls="ks-demo-board"[^>]* hidden>/);
  assert.doesNotMatch(markup, /ks-board-caption|ks-board-top|ks-board-demo/);
  const { button, board } = createBoard();
  assert.equal(button.hidden, false);
  assert.equal(board.dataset.revealed, 'false');
  assert.doesNotThrow(() => runInNewContext(source, { document: { querySelector: () => null } }));
});

test('every catalogued reveal preserves White and renders two Black moves without overlap', () => {
  assert.equal(sequences.length, 443);
  const placements = new Set();
  for (const [index, expectedMoves] of sequences.entries()) {
    const fixture = createBoard(() => (index + 0.5) / sequences.length);
    const whiteBefore = fixture.position('w');
    fixture.button.click();
    assert.deepEqual(fixture.position('w'), whiteBefore);
    assert.equal(whiteBefore.e4, 'wP');
    assert.equal(whiteBefore.f3, 'wN');
    assert.equal(Object.keys(fixture.position('b')).length, 16);
    assert.equal(fixture.board.dataset.moves, expectedMoves.join(' '));
    assert.equal(fixture.board.dataset.revealed, 'true');
    for (const { pieces } of fixture.squares.values()) assert.ok(pieces.length <= 1);
    for (const piece of fixture.board.querySelectorAll('.ks-opponent')) {
      assert.equal(piece.src, `/chess/cburnett/${piece.dataset.piece}.svg`);
    }
    placements.add(JSON.stringify(Object.entries(fixture.position('b')).sort()));
  }
  assert.equal(placements.size, 266);
});

test('hide and reveal update accessible state and never repeat the previous placement', () => {
  const fixture = createBoard();
  fixture.button.click();
  const firstPosition = fixture.position('b');
  assert.equal(fixture.prompt.hidden, true);
  assert.equal(fixture.button.attributes['aria-pressed'], 'true');
  assert.equal(fixture.button.attributes['aria-label'], 'Hide this possibility');
  assert.match(fixture.announcement.textContent, /Black played .+ to .+, then .+ to .+/);
  assert.equal(fixture.attributes['aria-label'], fixture.announcement.textContent);
  fixture.button.click();
  assert.equal(fixture.prompt.hidden, false);
  assert.equal(fixture.button.attributes['aria-pressed'], 'false');
  assert.equal(fixture.button.attributes['aria-label'], 'Reveal the possibility');
  assert.match(fixture.announcement.textContent, /Black’s pieces are hidden/);
  assert.deepEqual(fixture.position('b'), firstPosition);
  fixture.button.click();
  assert.notDeepEqual(fixture.position('b'), firstPosition);
});

test('homepage content remains escaped in headings, labels, and link attributes', () => {
  const attack = '<script>"&</script>';
  const html = renderHomeDesign({
    heroTitleLine1: attack, heroTitleLine2: 'Beyond', heroTitleEmphasis: attack,
    heroPrimaryCtaHref: attack, heroPrimaryCtaLabel: attack,
    boardRevealLabel: attack, boardHideLabel: attack,
    flowStep1Title: attack, communityInviteBody: attack, ctaBody: attack,
  });
  assert.doesNotMatch(html, /<script>"&<\/script>/);
  assert.match(html, /<h1 id="ks-hero-title">&lt;script&gt;&quot;&amp;&lt;\/script&gt;/);
  assert.match(html, /href="&lt;script&gt;&quot;&amp;&lt;\/script&gt;"/);
  assert.match(html, /data-reveal-label="&lt;script&gt;&quot;&amp;&lt;\/script&gt;"/);
  assert.match(renderHomeDesign({ heroTitle: 'A < fallback' }), /<h1 id="ks-hero-title">A &lt; fallback<\/h1>/);
});
