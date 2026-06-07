#!/usr/bin/env bash
# Smoke test for the FastAPI brochure generator.
# Usage:  ./test_api.sh                       # tests against anthropic.com
#         ./test_api.sh https://stripe.com    # tests any URL
set -euo pipefail

URL="${1:-https://anthropic.com}"
API="${API:-http://localhost:8000}"

echo "POST $API/generate  url=$URL"
RESPONSE=$(curl -sS -X POST "$API/generate" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$URL\"}")

echo "$RESPONSE" | python3 -m json.tool

RUN_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['run_id'])")
PDF_URL="$API/runs/$RUN_ID/pdf"
OUTFILE="runs/$RUN_ID/downloaded.pdf"

echo
echo "Downloading PDF from $PDF_URL"
curl -sS -o "$OUTFILE" "$PDF_URL"
echo "Saved to $OUTFILE"
ls -la "$OUTFILE"
open "$OUTFILE"
