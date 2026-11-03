#!/bin/sh
# Container entrypoint: migrate, seed an empty database, then start Next.js on $PORT.
set -eu

export DATABASE_URL="${DATABASE_URL:-file:/app/data/carsi.db}"
db_file="${DATABASE_URL#file:}"
mkdir -p "$(dirname "$db_file")"

if [ -z "${AUTH_SECRET:-}" ]; then
  AUTH_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
  export AUTH_SECRET
  echo "[carsi] WARNING: AUTH_SECRET is not set; generated a random secret. Sessions end on restart."
fi

node node_modules/prisma/build/index.js migrate deploy
node node_modules/tsx/dist/cli.mjs scripts/bootstrap-db.ts

# Pre-resize the LCP images in the background once the server is up (best-effort).
node scripts/warm-cache.mjs "http://127.0.0.1:${PORT:-10000}" &

exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${PORT:-10000}"
