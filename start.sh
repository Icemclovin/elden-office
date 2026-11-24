#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PORT="${PORT:-3737}"

echo "Shin-AI Tokyo (Groeiende 3D AI-Stad) wordt gestart op http://127.0.0.1:${PORT} ..."
exec node "${DIR}/server.mjs"
