#!/usr/bin/env bash
# One-time VM prep for HARDA on a fresh Ubuntu VM (GCP / any cloud).
# Installs Docker, git, and a 4 GB swap file (insurance for the torch build).
# Run once:  bash setup.sh
set -e

echo "==> Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

echo "==> Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
fi

echo "==> Installing git..."
sudo apt-get install -y git

echo "==> Adding 4 GB swap (if not already present)..."
if ! sudo swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo ""
echo "==> Done."
echo "    1. Log OUT and back IN (so Docker works without sudo)."
echo "    2. cp .env.example .env  &&  nano .env   # fill in secrets"
echo "    3. bash deploy.sh"
