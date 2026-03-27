export const LEADERBOARD_STALE_MS = 1000 * 60 * 15;

export function normalizeLeaderboardPayload(payload, now = Date.now()) {
  const issues = [];
  if (!payload || typeof payload !== "object") {
    return { entries: [], updatedAt: null, stale: false, issues: ["payload must be an object"] };
  }

  const updatedAt = payload.updatedAt && !Number.isNaN(Date.parse(payload.updatedAt))
    ? new Date(payload.updatedAt).toISOString()
    : null;

  if (!Array.isArray(payload.players)) {
    return { entries: [], updatedAt, stale: false, issues: ["players must be an array"] };
  }

  const entries = payload.players
    .map((player, idx) => normalizePlayer(player, idx, issues))
    .filter(Boolean);

  const stale = updatedAt ? (now - Date.parse(updatedAt)) > LEADERBOARD_STALE_MS : false;

  return { entries, updatedAt, stale, issues };
}

function normalizePlayer(player, idx, issues) {
  if (!player || typeof player !== "object") {
    issues.push(`players[${idx}] must be an object`);
    return null;
  }

  const handle = typeof player.handle === "string" && player.handle.trim().length > 0
    ? player.handle.trim()
    : null;
  const rating = Number.isFinite(player.rating) ? Number(player.rating) : null;
  const gamesPlayed = Number.isFinite(player.gamesPlayed) ? Number(player.gamesPlayed) : null;
  const trend = normalizeTrend(player.trend);

  if (!handle || rating === null || gamesPlayed === null) {
    issues.push(`players[${idx}] missing required fields`);
    return null;
  }

  return { handle, rating, gamesPlayed, trend };
}

function normalizeTrend(trend) {
  if (trend === "up" || trend === "down" || trend === "flat") return trend;
  return "flat";
}

export function sortEntries(entries, sortBy = "rating", direction = "desc") {
  const factor = direction === "asc" ? 1 : -1;
  const key = sortBy === "gamesPlayed" ? "gamesPlayed" : "rating";

  return [...entries].sort((a, b) => {
    if (a[key] === b[key]) return a.handle.localeCompare(b.handle);
    return (a[key] - b[key]) * factor;
  });
}

export function trendMarker(trend) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}
