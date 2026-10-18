#!/bin/zsh
# Double-click launcher: always builds the latest version, (re)starts the app and opens it in the browser.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$(readlink -f "$0")")" || exit 1
PORT=4173

[ -d node_modules ] || { echo "First start: installing packages (one time, ~1 min)..."; npm install || { read -k1; exit 1; }; }

echo "Building the latest version..."
npm run build --silent || { echo "Build failed - see the message above."; read -k1; exit 1; }

# An older copy of the app may still be running from an earlier start: stop it so the NEW version is served.
OLD=$(lsof -ti tcp:$PORT 2>/dev/null)
if [ -n "$OLD" ]; then
  echo "Stopping the old copy of the app..."
  kill $OLD 2>/dev/null
  sleep 1
fi

echo "Starting at http://localhost:$PORT - close this window to stop the app."
# open the browser as soon as the server answers, then run the server in the foreground
( for i in {1..40}; do curl -s -o /dev/null "http://localhost:$PORT" && { open "http://localhost:$PORT"; break; }; sleep 0.25; done ) &
npm run preview -- --port $PORT --strictPort
