#!/bin/bash
# ============================================================
#  JARVIS - one-click desktop launcher (Linux)
#  Run: ./jarvis-linux.sh   (or double-click and choose "Run")
#  Starts JARVIS and opens it in its own app window.
# ============================================================
cd "$(dirname "$0")" || exit 1
PORT=4173
URL="http://localhost:$PORT/index.html"

echo "  Booting J.A.R.V.I.S ..."

start_server() {
  if command -v node >/dev/null 2>&1; then node desktop/server.js "$PORT" >/dev/null 2>&1 & SRV=$!; return 0; fi
  if command -v python3 >/dev/null 2>&1; then python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; return 0; fi
  if command -v python  >/dev/null 2>&1; then python  -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!; return 0; fi
  return 1
}

open_app_window() {
  local target="$1"
  for b in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge brave-browser; do
    if command -v "$b" >/dev/null 2>&1; then "$b" --app="$target" --new-window >/dev/null 2>&1 & return 0; fi
  done
  xdg-open "$target" >/dev/null 2>&1 &   # default browser fallback
}

if start_server; then
  trap 'kill $SRV >/dev/null 2>&1' EXIT
  sleep 1
  open_app_window "$URL"
  echo "  JARVIS is up in its own window. Keep this terminal open."
  echo "  Press Ctrl+C to shut it down."
  wait $SRV
else
  echo "  No Node or Python found — opening directly (limited voice)."
  open_app_window "file://$PWD/index.html"
  read -r -p "  Press Enter to close."
fi
