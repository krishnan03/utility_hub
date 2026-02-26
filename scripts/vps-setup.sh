#!/bin/bash
# ── ToolsPilot VPS Initial Setup ─────────────────────────────────────
# Run this ONCE on your OVH VPS (Ubuntu 24.04) to set up the production environment.
# Usage: ssh root@40.160.231.246 'bash -s' < scripts/vps-setup.sh

set -euo pipefail

echo "🚀 Setting up ToolsPilot production environment..."

# Ensure we have sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Not running as root. Re-running with sudo..."
  exec sudo bash "$0" "$@"
fi

# ── 1. System updates ────────────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ── 2. Install Docker ────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# ── 3. Install Docker Compose plugin ─────────────────────────────────
if ! docker compose version &> /dev/null; then
  echo "📦 Installing Docker Compose..."
  # Add Docker's official apt repo if not present
  if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
  fi
  apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# ── 4. Install Git ───────────────────────────────────────────────────
apt-get install -y git

# ── 5. Clone the repo ────────────────────────────────────────────────
REPO_DIR="/home/ubuntu/utility_hub"
if [ ! -d "$REPO_DIR" ]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/krishnan03/utility_hub.git "$REPO_DIR"
  echo "✅ Repository cloned"
else
  echo "✅ Repository already exists, pulling latest..."
  cd "$REPO_DIR" && git pull origin main
fi

# ── 6. Set up firewall ───────────────────────────────────────────────
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (for later)
ufw --force enable
echo "✅ Firewall configured"

# ── 7. Build and start ───────────────────────────────────────────────
cd "$REPO_DIR"
docker compose build
docker compose up -d

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ ToolsPilot is running!"
echo "  🌐 http://40.160.231.246"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Add GitHub Secrets for auto-deploy:"
echo "     - VPS_HOST: 40.160.231.246"
echo "     - VPS_USER: root (or your deploy user)"
echo "     - VPS_PASSWORD: your VPS login password"
echo ""
echo "  2. Point your domain to 40.160.231.246"
echo "  3. Run scripts/setup-ssl.sh after DNS propagates"
