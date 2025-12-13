#!/bin/bash
cd "$(dirname "$0")"

# 1. Kill any existing python server on port 8000 to prevent "Address already in use"
# This ensures we don't have zombie servers keeping old tabs alive or blocking the new one.
pid=$(lsof -ti:8000)
if [ -n "$pid" ]; then
  echo "Stopping existing server (PID $pid)..."
  kill -9 $pid 2>/dev/null
fi

echo "Starting MedTracker Server..."

# 2. Start Python server in background & capture its Process ID (PID)
python3 -m http.server 8000 &
SERVER_PID=$!

# 3. Wait a moment for server to initialize before opening browser
# This prevents opening the tab before the server is ready (which can cause "localhost refused")
sleep 1

# 4. Open the browser
echo "Opening MedTracker..."
open "http://localhost:8000"

# 5. Instructions
echo ""
echo "=================================================="
echo "  MedTracker is running!"
echo "  PID: $SERVER_PID"
echo "  To stop the server, press Ctrl+C in this window."
echo "  (Closing the browser tab does NOT stop the server,"
echo "   you must close this window or Ctrl+C)"
echo "=================================================="
echo ""

# 6. Trap EXIT/Ctrl+C to kill the server cleanly
trap "kill $SERVER_PID" EXIT

# 7. Wait for the server process (keeps the script running until Ctrl+C)
wait $SERVER_PID
