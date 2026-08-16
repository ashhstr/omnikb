#!/usr/bin/env bash
# ============================================================
# OmniKB CLI & Background Runner for macOS / Linux
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if [ ! -d "$REPO_ROOT/dist" ]; then
  echo "[OmniKB] Building TypeScript project..."
  npm run build
fi

node "$REPO_ROOT/dist/cli.js" "$@"
