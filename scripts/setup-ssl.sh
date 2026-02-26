#!/bin/bash
# ── SSL Setup with Let's Encrypt ─────────────────────────────────────
# Run this AFTER pointing your domain to the VPS IP.
# Usage: ssh root@40.160.231.246 'bash -s' < scripts/setup-ssl.sh
#
# Prerequisites: Domain DNS A record pointing to 40.160.231.246

set -euo pipefail

DOMAIN="${1:?Usage: $0 <your-domain.com>}"
EMAIL="${2:-admin@$DOMAIN}"

echo "🔒 Setting up SSL for $DOMAIN..."

# Install certbot
apt-get install -y certbot

# Stop containers temporarily to free port 80
cd /opt/toolspilot
docker compose down

# Get certificate
certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

# Create Nginx SSL config
cat > /opt/toolspilot/nginx-ssl.conf << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://server:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 100M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_EOF

# Update docker-compose to mount SSL certs and use SSL config
# (User should update docker-compose.yml to mount /etc/letsencrypt)

# Restart
docker compose up -d

# Set up auto-renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'cd /opt/toolspilot && docker compose restart client'") | crontab -

echo ""
echo "✅ SSL configured for $DOMAIN"
echo "🌐 https://$DOMAIN"
