#!/usr/bin/env bash
set -euo pipefail

TARGET=""
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$(pwd)/deploy/artifacts}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to)
      TARGET="$2"; shift 2 ;;
    --artifact-root)
      ARTIFACT_ROOT="$2"; shift 2 ;;
    *)
      echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ "$TARGET" != "previous" ]]; then
  echo "Only --to previous is currently supported" >&2
  exit 2
fi

current_link="$ARTIFACT_ROOT/current"
previous_link="$ARTIFACT_ROOT/previous"

if [[ ! -L "$current_link" || ! -L "$previous_link" ]]; then
  echo "Expected symlinks at $current_link and $previous_link" >&2
  exit 1
fi

current_target="$(readlink "$current_link")"
previous_target="$(readlink "$previous_link")"

ln -sfn "$previous_target" "$current_link"
ln -sfn "$current_target" "$previous_link"

echo "Rollback complete: current -> $previous_target"
