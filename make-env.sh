#!/usr/bin/env bash
#
# Generate /home/ali/harda/.env for the homelab deployment.
#
# Secrets are generated ON THIS MACHINE with openssl and never typed into a chat
# window. The only value you supply by hand is your Google Maps API key.
#
# Usage:
#   cd /home/ali/harda
#   bash make-env.sh
#
set -euo pipefail

TARGET="/home/ali/harda/.env"
DOMAIN="harda.aliharizanuari.org"

if [ -f "$TARGET" ]; then
    echo "ERROR: $TARGET already exists. Move it aside first if you mean to regenerate."
    exit 1
fi

command -v openssl >/dev/null || { echo "openssl not found: sudo apt install -y openssl"; exit 1; }

read -rp "Google Maps API key (from your GCP console, or press Enter to fill in later): " MAPS_KEY
MAPS_KEY="${MAPS_KEY:-REPLACE_ME}"

POSTGRES_PASSWORD=$(openssl rand -hex 24)
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

umask 077          # .env is created readable only by you
cat > "$TARGET" <<EOF
# HARDA — homelab environment. Generated $(date '+%Y-%m-%d %H:%M:%S').
# NOT in git (.gitignore excludes .env). Back this up somewhere safe:
# losing JWT_SECRET_KEY invalidates every issued token.

# ── Database ────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/harda_db
TEST_DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/harda_test

# ── Flask ───────────────────────────────────────────────────────────────────
SECRET_KEY=${SECRET_KEY}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
FLASK_ENV=production

# ── Google Maps ─────────────────────────────────────────────────────────────
GOOGLE_MAPS_API_KEY=${MAPS_KEY}
VITE_GOOGLE_MAPS_API_KEY=${MAPS_KEY}

# ── API base ────────────────────────────────────────────────────────────────
# Relative path: the SPA calls /api/v1/... and nginx proxies to backend:5000 on
# the same origin, so this works identically on Tailscale and on the domain.
VITE_API_BASE_URL=/api/v1

# Cross-origin callers (the Expo mobile app) need to be listed explicitly.
CORS_ORIGINS=https://${DOMAIN}

# ── Rate limiting ───────────────────────────────────────────────────────────
RATELIMIT_ENABLED=true
RATELIMIT_STORAGE_URI=memory://
RATELIMIT_DEFAULT=200 per hour
RATELIMIT_AUTH=10 per minute
RATELIMIT_DETECTION=30 per hour

# ── YOLO ────────────────────────────────────────────────────────────────────
YOLO_MODEL_PATH=ml/weights/pothole_yolov8s.pt
YOLO_CONFIDENCE_THRESHOLD=0.70

# ── Uploads ─────────────────────────────────────────────────────────────────
UPLOAD_FOLDER=uploads/
MAX_CONTENT_LENGTH=10485760
EOF

chmod 600 "$TARGET"
echo
echo "Wrote $TARGET (permissions 600)."
echo "Generated: POSTGRES_PASSWORD, SECRET_KEY, JWT_SECRET_KEY"
if [ "$MAPS_KEY" = "REPLACE_ME" ]; then
    echo
    echo "NOTE: Google Maps key not set. The map views will not render until you"
    echo "      edit GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_API_KEY in $TARGET"
    echo "      and rebuild the frontend."
fi
