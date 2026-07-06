import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRulesPage, renderRuleDetailPage, renderRulesComparisonPage, renderSiteMarkdownPage } from '../src/pages.mjs';

test('rules landing page shows implemented and reference rules plus comparison link', () => {
  const html = renderRulesPage([
    { metadata: { slug: 'berkeley', title: 'Berkeley', summary: 'Classic referee calls.' }, body: '# Intro\n\n## Section One' },
    { metadata: { slug: 'cincinnati', title: 'Cincinnati style', summary: 'Historical public try-based rules.' }, body: '# Intro\n\n## Section One B' },
    { metadata: { slug: 'wild16', title: 'Wild 16', summary: 'ICC-style announcements.' }, body: '# Intro\n\n## Section Two' },
    { metadata: { slug: 'rand', title: 'RAND', summary: 'RAND reference.' }, body: '# Intro\n\n## Section Three' },
    { metadata: { slug: 'english', title: 'English kriegspiel rules', summary: 'Gambit Club rules.' }, body: '# Intro\n\n## Section Four' },
    { metadata: { slug: 'crazykrieg', title: 'CrazyKrieg / Crazyhouse Kriegspiel rules', summary: 'Crazyhouse Kriegspiel reference.' }, body: '# Intro\n\n## Section Five' },
    { metadata: { slug: 'dutch', title: 'Dutch kriegspiel rules', summary: 'Historical composition note.' }, body: '# Intro\n\n## Section Six' }
  ], []);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('/rules/rand'));
  assert.ok(html.includes('/rules/english'));
  assert.ok(html.includes('/rules/crazykrieg'));
  assert.ok(html.includes('/rules/dutch'));
  assert.ok(html.includes('Cincinnati'));
  assert.ok(!html.includes('Cincinnati style'));
  assert.ok(html.includes('Historical public rules centered on legal tries'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(html.includes('Different capture announcements and a built-in pawn-tries rule.'));
  assert.ok(html.includes('Playable online: Berkeley, Berkeley + Any, Cincinnati, Wild 16, RAND, English, and CrazyKrieg. Historical and composition references are marked separately.'));
  assert.ok(html.includes('RAND'));
  assert.ok(html.includes('Historical RAND reference from J. D. Williams'));
  assert.ok(html.includes('English'));
  assert.ok(html.includes('Gambit Club English rules with three boards'));
  assert.ok(html.includes('CrazyKrieg'));
  assert.ok(html.includes('Crazyhouse mixed with Kriegspiel'));
  assert.ok(html.includes('Dutch'));
  assert.ok(html.includes('Historical composition note for the Dutch capture convention'));
  assert.ok(html.includes('/rules/comparison/'));
  assert.equal((html.match(/Implemented online/g) || []).length, 6);
  assert.equal((html.match(/Historical reference: not playable online/g) || []).length, 1);
  assert.ok(!html.includes('RAND rules'));
  assert.ok(!html.includes('Planned ruleset'));
  assert.ok(!html.includes('Placeholder'));
  assert.ok(!html.includes('Reference rules, not implemented online'));
  assert.ok(!html.includes('Work in progress, play soon'));
  assert.ok(!html.includes('rules-berkeley-r1'));
  assert.ok(!html.includes('Linked changelog'));
  assert.ok(html.indexOf('>English</h2>') < html.indexOf('>CrazyKrieg</h2>'));
  assert.ok(html.indexOf('>CrazyKrieg</h2>') < html.indexOf('>Dutch</h2>'));
});

test('rule detail page keeps comparison navigation but removes metadata and toc clutter', () => {
  const html = renderRuleDetailPage(
    { metadata: { slug: 'berkeley', title: 'Berkeley', summary: 'Rules', version: '1.0.0', revision: 'rules-berkeley-r1', lastReviewedAt: '2026-03-27', publishedAt: '2026-03-27', updatedAt: '2026-03-27', author: 'Kriegspiel Team', changelogSlug: '2026-03-27-slice-940-trust-discoverability' }, body: '# Intro\n\n## Section One', bodyHtml: '<h1>Intro</h1>' },
    [{ metadata: { slug: '2026-03-27-slice-940-trust-discoverability' } }]
  );
  assert.ok(html.includes('/rules/comparison/'));
  assert.ok(!html.includes('/changelog/2026-03-27-slice-940-trust-discoverability'));
  assert.ok(!html.includes('rules-berkeley-r1'));
  assert.ok(!html.includes('On this page'));
});

test('comparison page links all published rulesets', () => {
  const html = renderRulesComparisonPage([
    { metadata: { slug: 'berkeley', summary: 'Berkeley summary' } },
    { metadata: { slug: 'cincinnati', summary: 'Cincinnati summary' } },
    { metadata: { slug: 'wild16', summary: 'Wild16 summary' } },
    { metadata: { slug: 'rand', summary: 'RAND summary' } },
    { metadata: { slug: 'english', summary: 'English summary' } },
    { metadata: { slug: 'crazykrieg', summary: 'CrazyKrieg summary' } },
    { metadata: { slug: 'dutch', summary: 'Dutch summary' } }
  ]);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('/rules/rand'));
  assert.ok(html.includes('/rules/english'));
  assert.ok(html.includes('/rules/crazykrieg'));
  assert.ok(html.includes('/rules/dutch'));
  assert.ok(html.includes('Published ruleset comparison'));
  assert.ok(html.includes('<a class="text-link" href="/rules/berkeley">Berkeley</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/cincinnati">Cincinnati</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/wild16">Wild 16</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/rand">RAND</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/english">English</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/crazykrieg">CrazyKrieg</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/dutch">Dutch</a>'));
  assert.ok(html.includes('Cincinnati'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(html.includes('rules-comparison-callout__actions'));
  assert.ok(html.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(!html.includes('>RAND reference</a>'));
  assert.ok(html.includes('>RAND rules</a>'));
  assert.ok(html.includes('>English rules</a>'));
  assert.ok(html.includes('>CrazyKrieg rules</a>'));
  assert.ok(html.includes('>Dutch rules</a>'));
  assert.ok(html.indexOf('>English rules</a>') < html.indexOf('>CrazyKrieg rules</a>'));
  assert.ok(html.indexOf('>CrazyKrieg rules</a>') < html.indexOf('>Dutch rules</a>'));
  assert.equal((html.match(/“Illegal” or “No” means the try is illegal on the true board/g) || []).length, 5);
  assert.equal((html.match(/After a legal capture, the captured square is announced to both players/g) || []).length, 4);
  assert.equal((html.match(/En passant is announced like a regular capture, using the square from which the pawn is removed/g) || []).length, 5);
  assert.equal((html.match(/The referee also says whether the captured material was a pawn or a piece/g) || []).length, 3);
  assert.ok(html.includes('A capture is announced with the capture square, calculated from the captured player’s side.'));
  assert.ok(html.includes('En passant is announced explicitly as en passant, using the capturing pawn’s landing square.'));
  assert.ok(html.includes('The referee still does not generally name the capturing man or captured man.'));
  assert.ok(!html.includes('Neither the capturing man nor the captured man is named.'));
  assert.ok(html.includes('After a legal capture, the captured square and reserve identity are announced to both players.'));
  assert.ok(html.includes('The known Dutch note identifies the capture square and whether the capturing man was a pawn or a piece.'));
  assert.ok(html.includes('Swart problem is framed in an “Are there any?” context'));
  assert.ok(html.includes('Promoted pawns are announced as pawns because they enter reserve as pawns.'));
  assert.ok(html.includes('File, rank, long diagonal, short diagonal, knight, and double checks are announced.'));
  assert.equal((html.match(/File, rank, long diagonal, short diagonal, knight, and double checks are announced/g) || []).length, 5);
  assert.ok(html.includes('Long, short, rank, file, knight, and double checks are announced.'));
  assert.ok(!html.includes('Illegal tries are public: the referee says “No” for hidden-position illegality, or “Impossible” / “Hell no” for impossible moves.'));
  assert.ok(html.includes('Pawn-capture handling — “Any?” rule handling'));
  assert.ok(html.includes('Before each ply starts, the referee publicly announces the number of legal capturing pawn moves.'));
  assert.ok(html.includes('the referee announces the squares on which the mover’s pawns have currently valid capture tries.'));
  assert.equal((html.match(/A player may ask whether any pawn capture exists. If the answer is “Yes”, the player must try one pawn capture; if that try is illegal, the player may make any legal move/g) || []).length, 2);
  assert.ok(!html.includes('A player may ask “Any?”; a positive answer obligates a pawn-capture try.'));
  assert.ok(!html.includes('When in check, only pawn tries that would eliminate the check are announced.'));
  assert.equal((html.match(/Promotion is not announced and should be handled silently/g) || []).length, 4);
  assert.ok(html.includes('The fact that a pawn promotes is announced, but not the promoted piece type or promotion square.'));
  assert.ok(!html.includes('No separate promotion announcement is listed; the umpire communicates only the details permitted by the rules.'));
  assert.ok(html.includes('If the promoted pawn is later captured, it enters reserve and is announced as a pawn.'));
  assert.ok(html.includes('Reserves and drops'));
  assert.equal((html.match(/No reserves or drops; play uses only the normal pieces on the board/g) || []).length, 5);
  assert.ok(html.includes('Captured units change color and enter public reserves.'));
  assert.ok(html.includes('A player may spend a turn dropping a reserve unit onto an empty square; the drop square is not announced.'));
  assert.ok(!html.includes('Board-handling model'));
  assert.ok(!html.includes('Berkeley summary'));
  assert.ok(!html.includes('Cincinnati summary'));
  assert.ok(!html.includes('Wild16 summary'));
  assert.ok(!html.includes('RAND summary'));
  assert.ok(!html.includes('English summary'));
  assert.ok(html.includes('simple capture-square notices, explicit en-passant notices, and a classic Yes/No pawn-capture question.'));
  assert.ok(!html.includes('CrazyKrieg summary'));
  assert.ok(!html.includes('Dutch summary'));
});

test('site markdown pages render policy content from ks-content entries', () => {
  const privacyHtml = renderSiteMarkdownPage({ metadata: { title: 'Privacy Policy', summary: 'Privacy notice', slug: 'privacy' }, bodyHtml: '<p>Policy owner: legal@kriegspiel.org</p>' });
  const termsHtml = renderSiteMarkdownPage({ metadata: { title: 'Terms of Use', summary: 'Terms notice', slug: 'terms' }, bodyHtml: '<p>Policy owner: legal@kriegspiel.org</p>' });
  assert.ok(privacyHtml.includes('Privacy Policy'));
  assert.ok(privacyHtml.includes('legal@kriegspiel.org'));
  assert.ok(termsHtml.includes('Terms of Use'));
  assert.ok(termsHtml.includes('legal@kriegspiel.org'));
});

test('site markdown pages keep wrapped tables as scrollable tables on narrow screens', () => {
  const html = renderSiteMarkdownPage({
    metadata: { title: 'Research', summary: 'Research page', slug: 'research' },
    bodyHtml: '<div class="table-wrap"><table><thead><tr><th>Year</th><th>Title</th></tr></thead><tbody><tr><td>1992</td><td>Mate with bishop and knight in kriegspiel</td></tr></tbody></table></div>'
  });
  assert.ok(html.includes('.table-wrap table{display:table;width:max-content;min-width:100%;table-layout:auto;}'));
  assert.ok(html.includes('.table-wrap thead{display:table-header-group;}'));
  assert.ok(html.includes('.table-wrap th,.table-wrap td{display:table-cell;padding:.7rem .75rem;}'));
  assert.ok(html.includes('.prose-card .table-wrap th:first-child,.prose-card .table-wrap td:first-child{width:auto;min-width:7rem;}'));
  assert.ok(html.includes('.prose-card .table-wrap code{white-space:normal;overflow-wrap:anywhere;word-break:break-word;}'));
  assert.ok(html.includes('@media (min-width:701px){.prose-card .table-wrap th:first-child,.prose-card .table-wrap td:first-child{width:26%;min-width:12rem;}}'));
});

test('site markdown pages include tier feature matrix styles', () => {
  const html = renderSiteMarkdownPage({
    metadata: { title: 'Kriegspiel Levels', summary: 'Levels page', slug: 'levels' },
    bodyHtml: '<div class="table-wrap tier-feature-table-wrap"><table class="tier-feature-table"></table></div>'
  });

  assert.ok(html.includes('<section class="content-section content-section--wide"><article class="prose-card prose-card--wide">'));
  assert.ok(html.includes('.content-section--wide{width:100%;}'));
  assert.ok(html.includes('.tier-feature-table-wrap{overflow-x:auto;'));
  assert.ok(!html.includes('.tier-feature-table-wrap{max-height:72vh;overflow:auto;'));
  assert.ok(html.includes('.tier-feature-table-wrap .tier-feature-table{min-width:86rem;table-layout:fixed;'));
  assert.ok(html.includes('.tier-feature-table thead th{position:sticky;top:0;z-index:4;'));
  assert.ok(html.includes('.tier-feature-table__tier-label'));
  assert.ok(html.includes('.tier-feature-table__detail{max-width:100%;font-size:.78rem;'));
  assert.ok(html.includes('.tier-feature-table tbody td.tier-feature-table__cell-text{text-align:left;vertical-align:top;'));
  assert.ok(html.includes('background:var(--tier-badge-bg);color:#f4ede4'));
  assert.ok(html.includes('.tier-feature-table__number::before{content:"";position:absolute;top:0;right:0;width:.92rem;height:.92rem;background:var(--tier-badge-corner);'));
  assert.ok(html.includes('.tier-feature-table__number--t1{--tier-badge-bg:#4a3325;--tier-badge-corner:#d38555;}'));
  assert.ok(html.includes('.tier-feature-table__number--t2{--tier-badge-bg:#5a4a1f;--tier-badge-corner:#d8bb45;}'));
  assert.ok(html.includes('.tier-feature-table__number--t3{--tier-badge-bg:#31553f;--tier-badge-corner:#7bd995;}'));
  assert.ok(html.includes('.tier-feature-table__number--t4{--tier-badge-bg:#255660;--tier-badge-corner:#67d9ec;}'));
  assert.ok(html.includes('.tier-feature-table__number--t5{--tier-badge-bg:#2f4772;--tier-badge-corner:#86a8ff;}'));
  assert.ok(html.includes('.tier-feature-table__number--t6{--tier-badge-bg:#56345d;--tier-badge-corner:#d88fe8;}'));
  assert.ok(html.includes('html[data-theme="dark"] .tier-feature-table__number{border-color:rgba(255,248,240,.24);'));
  assert.ok(html.includes('.tier-feature-table th.tier-feature-table__tier-column--unavailable,.tier-feature-table td.tier-feature-table__tier-column--unavailable{background:color-mix(in srgb,var(--surface-alt) 86%,#8a8580);'));
  assert.ok(html.includes('.tier-feature-table__tier-column--unavailable .tier-feature-table__number{--tier-badge-bg:#6f6a64;--tier-badge-corner:#c8bfb4;background:var(--tier-badge-bg);color:#f4ede4;}'));
  assert.ok(html.includes('.tier-feature-table tbody td.tier-feature-table__tier-column--unavailable{font-size:1.3rem;font-weight:800;'));
  assert.ok(html.includes('.tier-feature-table tbody td.tier-feature-table__tier-column--unavailable.tier-feature-table__cell-text{font-size:.84rem;font-weight:600;'));
  assert.ok(html.includes('width:2rem;min-width:2rem;height:2rem;padding:0;border-radius:0'));
  assert.ok(html.includes('.tier-feature-table__mark--yes'));
  assert.ok(html.includes('.tier-feature-table__mark--no'));
});
