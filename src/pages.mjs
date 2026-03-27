import { sortEntries, trendMarker } from "./leaderboard.mjs";
import { readingTimeMinutes } from "./content-utils.mjs";

export function renderShell({ title, main, activeNav = "/" }) {
  const nav = [["/", "Home"], ["/leaderboard", "Leaderboard"], ["/blog", "Blog"], ["/changelog", "Changelog"], ["/rules", "Rules"]];
  const navHtml = nav.map(([href, label]) => `<a href="${href}" ${activeNav === href ? "aria-current=\"page\"" : ""}>${label}</a>`).join(" ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title><style>${baseStyles()}</style></head><body><header><nav aria-label="Primary">${navHtml}</nav></header><main>${main}</main><footer><small>© Kriegspiel</small></footer></body></html>`;
}

export function renderHomePage({ rulesCount = 0, blogCount = 0 }) {
  return renderShell({ title: "Kriegspiel — Home", activeNav: "/", main: `<section id="hero"><h1>Play hidden-information chess, properly online.</h1><p>Kriegspiel keeps uncertainty and referee semantics while making games fast and fair.</p><a href="/leaderboard" data-telemetry-event="home_cta_click">See Leaderboard</a></section><section id="how-it-works"><h2>How it works</h2><ol><li>Queue for a match.</li><li>Receive legal/no announcements.</li><li>Review game narrative.</li></ol></section><section id="key-features"><h2>Key features</h2><ul><li>Asymmetric information preserved.</li><li>Fast async-friendly play.</li><li>Variant-specific referee output.</li></ul></section><section id="cta"><h2>Ready to play?</h2><a href="/rules">Read rules</a></section><section id="trust-snippet"><h2>Trust snapshot</h2><p>${rulesCount} rulesets documented, ${blogCount} public updates shipped.</p></section>` });
}

export function renderLeaderboardPage(entries = []) {
  const sorted = sortEntries(entries, "rating", "desc");
  const rows = sorted.map((entry, i) => `<tr><td>${i + 1}</td><td>${entry.handle}</td><td>${entry.rating}</td><td>${entry.gamesPlayed}</td><td aria-label="trend">${trendMarker(entry.trend)}</td></tr>`).join("");
  return renderShell({ title: "Kriegspiel — Leaderboard", activeNav: "/leaderboard", main: `<section><h1>Leaderboard</h1><p>Top active players, refreshed from ranking API.</p><div id="stale-banner" hidden role="status">Showing stale data. Refreshing…</div><div><button data-sort="rating" data-telemetry-event="leaderboard_sort">Sort by rating</button><button data-sort="gamesPlayed" data-telemetry-event="leaderboard_sort">Sort by games</button><button id="retry" data-telemetry-event="leaderboard_retry">Retry</button></div><div id="loading" role="status">Loading leaderboard…</div><div id="error" hidden role="alert">Could not load leaderboard. Try again.</div><div id="empty" hidden role="status">No ranked players yet.</div><table id="leaderboard-table" hidden><caption>Top players by rating</caption><thead><tr><th>Rank</th><th>Player</th><th>Rating</th><th>Games</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table></section><script>(function(){const state={entries:[]};const el={loading:document.getElementById('loading'),error:document.getElementById('error'),empty:document.getElementById('empty'),table:document.getElementById('leaderboard-table'),tbody:document.querySelector('#leaderboard-table tbody'),stale:document.getElementById('stale-banner')};function render(kind){el.loading.hidden=kind!=='loading';el.error.hidden=kind!=='error';el.empty.hidden=kind!=='empty';el.table.hidden=kind!=='ready';}function emit(name,detail){window.dispatchEvent(new CustomEvent('telemetry',{detail:{name,...detail}}));}function draw(entries){el.tbody.innerHTML=entries.map((entry,i)=>'<tr><td>'+(i+1)+'</td><td>'+entry.handle+'</td><td>'+entry.rating+'</td><td>'+entry.gamesPlayed+'</td><td>'+(entry.trend==='up'?'↑':entry.trend==='down'?'↓':'→')+'</td></tr>').join('');render(entries.length===0?'empty':'ready');}function normalize(payload){if(!payload||!Array.isArray(payload.players))throw new Error('malformed payload');return payload.players.filter((p)=>p&&typeof p.handle==='string'&&Number.isFinite(p.rating)&&Number.isFinite(p.gamesPlayed)).map((p)=>({handle:p.handle,rating:p.rating,gamesPlayed:p.gamesPlayed,trend:p.trend==='up'||p.trend==='down'?p.trend:'flat'}));}function sortBy(field){state.entries.sort((a,b)=>(b[field]-a[field])||a.handle.localeCompare(b.handle));draw(state.entries);emit('leaderboard_sort',{field});}async function load(){render('loading');try{const res=await fetch('/api/leaderboard',{cache:'no-store'});if(!res.ok)throw new Error('http');const payload=await res.json();state.entries=normalize(payload);if(payload.updatedAt&&(Date.now()-Date.parse(payload.updatedAt))>(15*60*1000)){el.stale.hidden=false;}else{el.stale.hidden=true;}draw(state.entries);}catch(_){render('error');}}document.querySelectorAll('[data-sort]').forEach((btn)=>btn.addEventListener('click',()=>sortBy(btn.getAttribute('data-sort'))));document.getElementById('retry').addEventListener('click',()=>{emit('leaderboard_retry',{});load();});load();})();</script>` });
}

export function renderBlogIndex(entries) {
  const items = entries.map((entry) => `<li><a href="/blog/${entry.metadata.slug}">${entry.metadata.title}</a> <small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small><p>${entry.metadata.summary}</p></li>`).join("");
  return renderShell({ title: "Kriegspiel — Blog", activeNav: "/blog", main: `<section><h1>Blog</h1><p>Editorial updates from the Kriegspiel team.</p><ul>${items}</ul><p><a href="/blog/archive">Browse archive</a></p></section>` });
}

export const renderBlogDetail = (entry) => renderShell({ title: `Kriegspiel — ${entry.metadata.title}`, activeNav: "/blog", main: `<article><h1>${entry.metadata.title}</h1><p><small>${entry.metadata.publishedAt} • ${entry.metadata.author} • ${readingTimeMinutes(entry.body)} min read</small></p><p>${entry.metadata.summary}</p>${entry.bodyHtml}<p><a href="/blog">Back to blog</a></p></article>` });

export function renderBlogArchive(entries) {
  const groups = new Map();
  for (const entry of entries) { const year = String(entry.metadata.publishedAt).slice(0, 4); if (!groups.has(year)) groups.set(year, []); groups.get(year).push(entry); }
  const html = Array.from(groups.entries()).map(([year, posts]) => `<section><h2>${year}</h2><ul>${posts.map((post) => `<li><a href="/blog/${post.metadata.slug}">${post.metadata.title}</a></li>`).join("")}</ul></section>`).join("");
  return renderShell({ title: "Kriegspiel — Blog Archive", activeNav: "/blog", main: `<h1>Blog archive</h1>${html}` });
}

export function renderChangelogIndex(entries) {
  const items = entries.map((entry) => `<li><a href="/changelog/${entry.metadata.slug}">${entry.metadata.version} — ${entry.metadata.title}</a> <small>${entry.metadata.publishedAt}</small><p>${entry.metadata.summary}</p></li>`).join("");
  return renderShell({ title: "Kriegspiel — Changelog", activeNav: "/changelog", main: `<section><h1>Changelog</h1><p>Versioned release history.</p><ul>${items}</ul></section>` });
}

export const renderChangelogDetail = (entry) => renderShell({ title: `Kriegspiel — ${entry.metadata.title}`, activeNav: "/changelog", main: `<article><h1>${entry.metadata.title}</h1><p><small>Version ${entry.metadata.version} • ${entry.metadata.publishedAt}</small></p><p>${entry.metadata.summary}</p>${entry.bodyHtml}<p><a href="/changelog">Back to changelog</a></p></article>` });

export const renderSimplePage = (title) => renderShell({ title: `Kriegspiel — ${title}`, main: `<h1>${title}</h1><p>Generated by ks-home build.</p>` });

function baseStyles() { return `:root{font-family:system-ui,sans-serif;color-scheme:light dark;}body{margin:0 auto;max-width:960px;padding:1rem;line-height:1.45;}nav{display:flex;flex-wrap:wrap;gap:.75rem;}section{margin:1.5rem 0;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #888;padding:.45rem;text-align:left;}@media (max-width:700px){nav{gap:.5rem;font-size:.95rem;}table,thead,tbody,tr,th,td{display:block;}tr{border:1px solid #777;margin-bottom:.6rem;}th{display:none;}}`; }
