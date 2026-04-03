#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$BASE_DIR/release_bundle/index.html" >/dev/null 2>&1 || true
fi
echo "Open this file in a browser if not auto-opened: $BASE_DIR/release_bundle/index.html"
