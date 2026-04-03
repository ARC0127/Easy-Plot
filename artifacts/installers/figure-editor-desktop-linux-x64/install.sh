#!/usr/bin/env bash
set -euo pipefail
TARGET_DIR="${1:-$HOME/.local/share/figure-editor}"
mkdir -p "$TARGET_DIR"
cp -R "./release_bundle/." "$TARGET_DIR/"
chmod +x "$TARGET_DIR/run-figure-editor.sh" || true
echo "Figure Editor installed to: $TARGET_DIR"
