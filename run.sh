#!/usr/bin/env bash
# Start the FastAPI dev server.
# Mac-only quirk: WeasyPrint needs DYLD_FALLBACK_LIBRARY_PATH pointing at
# Homebrew's lib dir so it can find pango/cairo/gobject. On Render (Linux)
# these libs live in standard /usr/lib paths so this isn't needed.
set -euo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:${DYLD_FALLBACK_LIBRARY_PATH:-}"
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
