#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-}"
ROUTES="/,/leaderboard,/blog,/changelog,/rules"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"; shift 2 ;;
    --routes)
      ROUTES="$2"; shift 2 ;;
    *)
      echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$BASE_URL" ]]; then
  echo "BASE_URL or --base-url is required" >&2
  exit 2
fi

IFS=, read -r -a route_array <<< "$ROUTES"
for route in "${route_array[@]}"; do
  url="${BASE_URL%/}${route}"
  echo "smoke: $url"
  curl -fsS "$url" >/dev/null
done

echo "smoke PASS (${#route_array[@]} routes)"
