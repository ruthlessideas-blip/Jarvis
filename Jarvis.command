#!/bin/bash
# ============================================================
#  JARVIS — one-click desktop launcher (macOS)
#  Double-click this file. It starts JARVIS and opens it in its
#  own app window. No setup, no typing localhost.
# ============================================================
cd "$(dirname "$0")" || exit 1
PORT=4173
URL="http://localhost:$PORT/index.html"

clear
echo "  Booting J.A.R.V.I.S ..."
echo ""

start_server() {
  if command -v node >/dev/null 2>&1; then node desktop/server.js "$PORT" >/dev/null 2>&1 & SRV=$!; return 0; fi
  if command -v python3 >/dev/null 2>&1; then python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; return 0; fi
  if command -v python  >/dev/null 2>&1; then python  -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!; return 0; fi
  return 1
}

open_app_window() {
  local target="$1"
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$target" --new-window
  elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$target" --new-window
  elif [ -d "/Applications/Chromium.app" ]; then
    open -na "Chromium" --args --app="$target" --new-window
  elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="$target" --new-window
  else
    open "$target"   # falls back to your default browser (a normal tab)
  fi
}

if start_server; then
  trap 'kill $SRV >/dev/null 2>&1' EXIT
  sleep 1
  open_app_window "$URL"
  echo "  JARVIS is up — it should appear in its own window."
  echo ""
  echo "  Keep THIS little window open while you use JARVIS."
  echo "  To shut it down: close this window, or press Ctrl+C."
  wait $SRV
else
  echo "  (No Node or Python found — opening JARVIS directly.)"
  echo "  Tip: install Node.js from nodejs.org for full voice support."
  open_app_window "file://$PWD/index.html"
  echo ""
  read -r -p "  Press Enter to close this window."
fi
