#!/usr/bin/env bash
# Pull the latest code and (re)build + restart HARDA. Run from the repo root.
# Usage:  bash deploy.sh
set -e

echo "==> Pulling latest code..."
git pull

echo "==> Building & starting containers (first build is slow — torch is large)..."
docker compose up -d --build

echo "==> Status:"
docker compose ps

echo ""
echo "==> HARDA is up. Follow backend logs with:  docker compose logs -f backend"
