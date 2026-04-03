#!/usr/bin/env bash
set -euo pipefail
TARGET_DIR="${1:-$HOME/.local/share/easy-plot}"
mkdir -p "$TARGET_DIR"
cp -R "./release_bundle/." "$TARGET_DIR/"
chmod +x "$TARGET_DIR/run-easy-plot.sh" || true
echo "Easy Plot installed to: $TARGET_DIR"
