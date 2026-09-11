#!/bin/bash
# ==========================================
# Trader Zone - macOS One-Click Dock Launcher
# ==========================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=3000

# Check if server is already running on port 3000
if ! lsof -i :$PORT >/dev/null 2>&1; then
  # Build if dist doesn't exist
  if [ ! -d "dist" ]; then
    echo "First time build..."
    npm run build
  fi
  # Start a lightweight background static server
  npx -y serve -s dist -l $PORT >/dev/null 2>&1 &
  sleep 1.5
fi

# Open in Chrome App mode if Chrome is installed, else default browser
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args "--app=http://localhost:$PORT"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args "--app=http://localhost:$PORT"
else
  open "http://localhost:$PORT"
fi

exit 0
