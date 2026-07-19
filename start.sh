#!/usr/bin/env bash
# Launch the JARVIS command center on a local web server and open it.
set -e
cd "$(dirname "$0")"
PORT="${1:-4173}"
URL="http://localhost:${PORT}"

echo "  J.A.R.V.I.S  →  ${URL}"
echo "  (press Ctrl+C to stop)"

# Open the browser shortly after the server starts.
( sleep 1
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) &

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
else
  echo "Python not found. Install Python, or just double-click index.html."
  exit 1
fi
