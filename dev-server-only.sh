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

# --- Start Express server ---
echo ""
echo "========================================="
echo "  Express API:  http://localhost:3001"
echo "  Run the Vite client separately with:"
echo "    npm run dev:client"
echo "========================================="
echo ""

npm run dev:server
