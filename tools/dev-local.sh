#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Install web dependencies:"
echo "  pnpm install"
echo

echo "Run local web app:"
echo "  pnpm --filter web dev"
echo

echo "Run local infrastructure:"
echo "  docker compose -f infra/docker-compose.yml up --build"
