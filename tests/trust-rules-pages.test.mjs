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
    { metadata: { slug: 'crazykrieg', title: 'CrazyKrieg / Crazyhouse Kriegspiel rules', summary: 'Crazyhouse Kriegspiel reference.' }, body: '# Intro\n\n## Section Five' }
  ], []);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('/rules/rand'));
  assert.ok(html.includes('/rules/english'));
  assert.ok(html.includes('/rules/crazykrieg'));
  assert.ok(html.includes('Cincinnati'));
  assert.ok(!html.includes('Cincinnati style'));
  assert.ok(html.includes('Historical public rules centered on legal tries'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(html.includes('Different capture announcements and a built-in pawn-tries rule.'));
  assert.ok(html.includes('Berkeley, Berkeley + Any, Cincinnati, and Wild 16 are implemented online.'));
  assert.ok(html.includes('RAND, English, and CrazyKrieg are published as reference rulesets.'));
  assert.ok(html.includes('RAND'));
  assert.ok(html.includes('Historical RAND reference from J. D. Williams'));
  assert.ok(html.includes('English'));
  assert.ok(html.includes('Gambit Club English rules with three boards'));
  assert.ok(html.includes('CrazyKrieg'));
  assert.ok(html.includes('Crazyhouse mixed with Kriegspiel'));
  assert.ok(html.includes('/rules/comparison/'));
  assert.equal((html.match(/Implemented online/g) || []).length, 3);
  assert.equal((html.match(/Historical reference/g) || []).length, 2);
  assert.equal((html.match(/Reference rules/g) || []).length, 1);
  assert.ok(!html.includes('RAND rules'));
  assert.ok(!html.includes('Planned ruleset'));
  assert.ok(!html.includes('Placeholder'));
  assert.ok(!html.includes('Reference rules, not implemented online'));
  assert.ok(!html.includes('Work in progress, play soon'));
  assert.ok(!html.includes('rules-berkeley-r1'));
  assert.ok(!html.includes('Linked changelog'));
  assert.ok(html.indexOf('>English</h2>') < html.indexOf('>CrazyKrieg</h2>'));
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
    { metadata: { slug: 'crazykrieg', summary: 'CrazyKrieg summary' } }
  ]);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('/rules/rand'));
  assert.ok(html.includes('/rules/english'));
  assert.ok(html.includes('/rules/crazykrieg'));
  assert.ok(html.includes('Published ruleset comparison'));
  assert.ok(html.includes('<a class="text-link" href="/rules/berkeley">Berkeley</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/cincinnati">Cincinnati</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/wild16">Wild 16</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/rand">RAND</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/english">English</a>'));
  assert.ok(html.includes('<a class="text-link" href="/rules/crazykrieg">CrazyKrieg</a>'));
  assert.ok(html.includes('Cincinnati'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(html.includes('rules-comparison-callout__actions'));
  assert.ok(html.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(!html.includes('>RAND reference</a>'));
  assert.ok(html.includes('>RAND rules</a>'));
  assert.ok(html.includes('>English rules</a>'));
  assert.ok(html.includes('>CrazyKrieg rules</a>'));
  assert.ok(html.indexOf('>English rules</a>') < html.indexOf('>CrazyKrieg rules</a>'));
  assert.equal((html.match(/“Illegal” or “No” means the try is illegal on the true board/g) || []).length, 3);
  assert.equal((html.match(/After a legal capture, the captured square is announced to both players/g) || []).length, 4);
  assert.equal((html.match(/The referee also says whether the captured material was a pawn or a piece/g) || []).length, 3);
  assert.ok(html.includes('A capture is announced with the capture square, calculated from the captured player’s side.'));
  assert.ok(html.includes('Neither the capturing man nor the captured man is named.'));
  assert.ok(html.includes('After a legal capture, the captured square and reserve identity are announced to both players.'));
  assert.ok(html.includes('Promoted pawns are announced as pawns because they enter reserve as pawns.'));
  assert.ok(html.includes('File, rank, long diagonal, short diagonal, knight, and double checks are announced.'));
  assert.equal((html.match(/File, rank, long diagonal, short diagonal, knight, and double checks are announced/g) || []).length, 5);
  assert.ok(html.includes('Long, short, rank, file, and knight checks are announced.'));
  assert.ok(html.includes('Pawn-capture handling — “Any?” rule handling'));
  assert.ok(html.includes('Before each ply starts, the referee publicly announces the number of legal capturing pawn moves.'));
  assert.ok(html.includes('the referee announces the squares on which the mover’s pawns have currently valid capture tries.'));
  assert.ok(html.includes('If the answer is “Yes”, the player must try one pawn capture'));
  assert.ok(html.includes('A player may ask “Any?”; a positive answer obligates a pawn-capture try.'));
  assert.ok(!html.includes('When in check, only pawn tries that would eliminate the check are announced.'));
  assert.equal((html.match(/Promotion is not announced and should be handled silently/g) || []).length, 3);
  assert.ok(html.includes('The fact that a pawn promotes is announced, but not the promoted piece type or promotion square.'));
  assert.ok(html.includes('No separate promotion announcement is listed; the umpire communicates only the details permitted by the rules.'));
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
  assert.ok(!html.includes('CrazyKrieg summary'));
});

test('site markdown pages render policy content from content repo entries', () => {
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
});
