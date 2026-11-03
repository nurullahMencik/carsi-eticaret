# syntax=docker/dockerfile:1.7
# Çarşı — Next.js + Prisma (SQLite). Runs `prisma migrate deploy`, seeds an empty
# database and starts `next start` on $PORT (Render sets PORT; default 10000).

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Build tools only for the rare case better-sqlite3 has no prebuilt binary.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- build: all dependencies, production build
FROM base AS build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build && rm -rf .next/cache

# ---- runtime: production dependencies only (prisma, tsx and dotenv are runtime deps for migrate/seed)
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=10000 \
    DATABASE_URL=file:/app/data/carsi.db
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/assets ./assets
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/docker ./docker
COPY --from=build /app/next.config.ts /app/tsconfig.json ./
RUN mkdir -p /app/data && chown -R node:node /app/data /app/.next
USER node
EXPOSE 10000
CMD ["sh", "docker/start.sh"]
