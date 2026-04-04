#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/home/fil/dev/kriegspiel}"
KS_HOME_REPO="${KS_HOME_REPO:-$ROOT/ks-home}"
CONTENT_REPO="${CONTENT_REPO:-$ROOT/content}"
WORK_ROOT="${WORK_ROOT:-$ROOT/.site-refresh}"
KS_API_BASE="${KS_API_BASE:-https://api.kriegspiel.org}"
HOME_BRANCH="${HOME_BRANCH:-master}"
CONTENT_BRANCH="${CONTENT_BRANCH:-master}"

HOME_WORKTREE="$WORK_ROOT/ks-home-$HOME_BRANCH"
CONTENT_WORKTREE="$WORK_ROOT/content-$CONTENT_BRANCH"
LOCK_FILE="$WORK_ROOT/refresh.lock"

mkdir -p "$WORK_ROOT"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

ensure_worktree() {
  local repo="$1"
  local branch="$2"
  local worktree="$3"

  git -C "$repo" fetch origin "$branch"

  if [[ ! -d "$worktree" ]]; then
    git -C "$repo" worktree add --detach "$worktree" "origin/$branch"
  else
    git -C "$worktree" reset --hard "origin/$branch"
    git -C "$worktree" clean -fd
  fi
}

ensure_worktree "$KS_HOME_REPO" "$HOME_BRANCH" "$HOME_WORKTREE"
ensure_worktree "$CONTENT_REPO" "$CONTENT_BRANCH" "$CONTENT_WORKTREE"

if [[ ! -e "$HOME_WORKTREE/node_modules" ]]; then
  ln -s "$KS_HOME_REPO/node_modules" "$HOME_WORKTREE/node_modules"
fi

if [[ ! -d "$KS_HOME_REPO/dist" ]]; then
  mkdir -p "$KS_HOME_REPO/dist"
fi

cd "$HOME_WORKTREE"
KS_CONTENT_PATH="$CONTENT_WORKTREE" KS_API_BASE="$KS_API_BASE" npm run build
rsync -a --delete "$HOME_WORKTREE/dist/" "$KS_HOME_REPO/dist/"

