import { readFileSync } from 'node:fs';

const legalReplies = JSON.parse(readFileSync(new URL('./home-possibilities.json', import.meta.url), 'utf8'));

const whitePosition = {
  e4: 'wP', f3: 'wN', a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
  a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', h1: 'wR',
};
const blackStart = {
  a8: 'bR', b8: 'bN', c8: 'bB', d8: 'bQ', e8: 'bK', f8: 'bB', g8: 'bN', h8: 'bR',
  a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
};

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderBoard(content) {
  const position = { ...whitePosition, ...blackStart };
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    const square = 'abcdefgh'[col] + (8 - row);
    const piece = position[square];
    const classes = ['ks-square', (row + col) % 2 ? 'ks-dark-square' : '', ['f3', 'g1'].includes(square) ? 'ks-last' : ''].filter(Boolean).join(' ');
    const rank = col === 0 ? `<span class="ks-coordinate ks-rank">${8 - row}</span>` : '';
    const file = row === 7 ? `<span class="ks-coordinate ks-file">${'abcdefgh'[col]}</span>` : '';
    const image = piece ? `<img src="/chess/cburnett/${piece}.svg" data-piece="${piece}"${piece.startsWith('b') ? ' class="ks-opponent"' : ''} width="45" height="45" alt="" draggable="false">` : '';
    return `<div class="${classes}" data-square="${square}" aria-hidden="true">${rank}${file}${image}</div>`;
  }).join('');
  const reveal = content.boardRevealLabel || 'Reveal the possibility';
  const hide = content.boardHideLabel || 'Hide this possibility';
  return `<figure class="ks-board-figure" data-home-board aria-label="Illustration of a Kriegspiel board from White’s perspective">
    <div class="ks-board" id="ks-demo-board" data-board data-revealed="false" role="img" aria-label="Illustrative position after White played e4 and Nf3. Black’s pieces are hidden.">${squares}<div class="ks-board-fog" aria-hidden="true"></div></div>
    <button class="ks-board-toggle" data-board-toggle type="button" aria-label="${esc(reveal)}" aria-pressed="false" aria-controls="ks-demo-board" data-reveal-label="${esc(reveal)}" data-hide-label="${esc(hide)}" hidden><span class="ks-board-prompt">${esc(reveal)}</span></button>
    <span class="ks-board-announcement" data-board-announcement aria-live="polite" aria-atomic="true"></span>
    <script type="application/json" data-home-possibilities>${JSON.stringify(legalReplies).replaceAll('<', '\\u003c')}</script>
  </figure>`;
}

/** Approved homepage composition; editable copy comes from ks-content/site/home. */
export function renderHomeDesign(content = {}) {
  const title = content.heroTitleLine1 && content.heroTitleLine2 && content.heroTitleEmphasis
    ? `${esc(content.heroTitleLine1)}<br>${esc(content.heroTitleLine2)}<br> <em>${esc(content.heroTitleEmphasis)}</em>`
    : esc(content.heroTitle);
  const steps = [1, 2, 3].map(index => `<li><h3>${esc(content[`flowStep${index}Title`])}</h3><p>${esc(content[`flowStep${index}Body`])}</p></li>`).join('');
  return `<div class="home-design">
    <section id="hero" class="ks-wrap ks-hero" aria-labelledby="ks-hero-title">
      <div>
        <h1 id="ks-hero-title">${title}</h1>
        <p class="ks-lede">${esc(content.heroLede)}</p>
        <div class="ks-actions">
          <a class="ks-primary" href="${esc(content.heroPrimaryCtaHref)}" data-telemetry-event="home_cta_click">${esc(content.heroPrimaryCtaLabel)} <span aria-hidden="true">↗</span></a>
          <a class="ks-text-link" href="${esc(content.heroSecondaryCtaHref)}">${esc(content.heroSecondaryCtaLabel)} <span class="ks-arrow" aria-hidden="true">→</span></a>
        </div>
      </div>
      ${renderBoard(content)}
    </section>
    <section id="how-it-works" class="ks-wrap ks-how" aria-labelledby="ks-how-title">
      <div class="ks-section-top"><h2 id="ks-how-title">${esc(content.flowTitle)}</h2><p>${esc(content.flowIntro)}</p></div>
      <ol class="ks-steps">${steps}</ol>
    </section>
    <section class="ks-community" aria-labelledby="ks-community-title">
      <div class="ks-wrap ks-community-inner">
        <div class="ks-community-label">${esc(content.communityLabelLine1)}<br> ${esc(content.communityLabelLine2)}</div>
        <div><h2 id="ks-community-title">${esc(content.communityInviteTitle)}</h2><p>${esc(content.communityInviteBody)}</p></div>
        <a class="ks-community-link" href="${esc(content.communityInviteCtaHref)}">${esc(content.communityInviteCtaLabel)} <span class="ks-arrow" aria-hidden="true">↗</span></a>
      </div>
    </section>
    <section id="cta" class="ks-wrap ks-closing" aria-labelledby="ks-closing-title">
      <div><h2 id="ks-closing-title">${esc(content.ctaTitle)}</h2><p>${esc(content.ctaBody)}</p></div>
      <a class="ks-primary" href="${esc(content.ctaPrimaryHref)}">${esc(content.ctaPrimaryLabel)} <span aria-hidden="true">↗</span></a>
    </section>
  </div>`;
}
