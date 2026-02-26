#!/usr/bin/env bash
set -e

# --- Check Node.js version ---
required_major=18
node_version=$(node -v 2>/dev/null | sed 's/^v//')
if [ -z "$node_version" ]; then
  echo "❌ Node.js is not installed. Please install Node.js >= $required_major."
  exit 1
fi
node_major=$(echo "$node_version" | cut -d. -f1)
if [ "$node_major" -lt "$required_major" ]; then
  echo "❌ Node.js v$node_version found. v$required_major+ is required."
  exit 1
fi
echo "✅ Node.js v$node_version"

# --- Install dependencies ---
echo "📦 Installing dependencies..."
npm install

# --- Create upload directories ---
mkdir -p uploads/input uploads/output
echo "📁 Upload directories ready"

# --- Cleanup on exit ---
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  [ -n "$server_pid" ] && kill "$server_pid" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# --- Start Express server in background ---
echo "🚀 Starting Express server on port 3001..."
npm run dev:server &
server_pid=$!

# --- Wait a moment for the server to start ---
sleep 1

# --- Start Vite dev server in foreground ---
echo "🚀 Starting Vite dev server on port 5173..."
echo ""
echo "========================================="
echo "  Express API:  http://localhost:3001"
echo "  Vite client:  http://localhost:5173"
echo "  Press Ctrl+C to stop both servers"
echo "========================================="
echo ""

npm run dev:client

# If Vite exits on its own, clean up the server
cleanup
