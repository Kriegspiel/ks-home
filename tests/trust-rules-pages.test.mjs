import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRulesPage, renderRuleDetailPage, renderRulesComparisonPage, renderSiteMarkdownPage } from '../src/pages.mjs';

test('rules landing page shows Berkeley, Cincinnati style, and Wild 16 tiles plus comparison link', () => {
  const html = renderRulesPage([
    { metadata: { slug: 'berkeley', title: 'Berkeley', summary: 'Classic referee calls.' }, body: '# Intro\n\n## Section One' },
    { metadata: { slug: 'cincinnati', title: 'Cincinnati style', summary: 'Historical public try-based rules.' }, body: '# Intro\n\n## Section One B' },
    { metadata: { slug: 'wild16', title: 'Wild 16', summary: 'ICC-style announcements.' }, body: '# Intro\n\n## Section Two' }
  ], []);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('Cincinnati style'));
  assert.ok(html.includes('Historical public rules centered on legal tries'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(html.includes('Different capture announcements and a built-in pawn-tries rule.'));
  assert.ok(html.includes('/rules/comparison/'));
  assert.ok(html.includes('Implemented, play today'));
  assert.ok(html.includes('Reference rules, not implemented online'));
  assert.ok(html.includes('Work in progress, play soon'));
  assert.ok(!html.includes('rules-berkeley-r1'));
  assert.ok(!html.includes('Linked changelog'));
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
    { metadata: { slug: 'wild16', summary: 'Wild16 summary' } }
  ]);
  assert.ok(html.includes('/rules/berkeley'));
  assert.ok(html.includes('/rules/cincinnati'));
  assert.ok(html.includes('/rules/wild16'));
  assert.ok(html.includes('Published ruleset comparison'));
  assert.ok(html.includes('Cincinnati style'));
  assert.ok(html.includes('Wild 16'));
  assert.ok(!html.includes('Berkeley summary'));
  assert.ok(!html.includes('Cincinnati summary'));
  assert.ok(!html.includes('Wild16 summary'));
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
