#!/bin/bash
# ── UtilityHub VPS Initial Setup ─────────────────────────────────────
# Run this ONCE on your OVH VPS (Ubuntu 24.04) to set up the production environment.
# Usage: ssh root@40.160.231.246 'bash -s' < scripts/vps-setup.sh

set -euo pipefail

echo "🚀 Setting up UtilityHub production environment..."

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
  apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# ── 4. Install Git ───────────────────────────────────────────────────
apt-get install -y git

# ── 5. Clone the repo ────────────────────────────────────────────────
if [ ! -d /opt/utility-hub ]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/krishnan03/utility_hub.git /opt/utility-hub
  echo "✅ Repository cloned"
else
  echo "✅ Repository already exists, pulling latest..."
  cd /opt/utility-hub && git pull origin main
fi

# ── 6. Set up firewall ───────────────────────────────────────────────
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (for later)
ufw --force enable
echo "✅ Firewall configured"

# ── 7. Build and start ───────────────────────────────────────────────
cd /opt/utility-hub
docker compose build
docker compose up -d

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ UtilityHub is running!"
echo "  🌐 http://40.160.231.246"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Add GitHub Secrets for auto-deploy:"
echo "     - VPS_HOST: 40.160.231.246"
echo "     - VPS_USER: root (or your deploy user)"
echo "     - VPS_SSH_KEY: (your private SSH key)"
echo "     - VPS_PORT: 22"
echo ""
echo "  2. Point your domain to 40.160.231.246"
echo "  3. Run scripts/setup-ssl.sh after DNS propagates"
