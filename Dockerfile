# syntax=docker/dockerfile:1

# ---- deps ----------------------------------------------------------------
# Installs node_modules once, compiling bcrypt's native addon for Linux.
FROM node:24-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---- build -----------------------------------------------------------------
# `npm run build` auto-runs the `prebuild` lifecycle script first, which
# generates both Prisma clients (main + repository) before `next build` runs.
#
# No NEXT_PUBLIC_* build ARGs are declared here. Verified by grepping every
# 'use client' file (109 total) and every non-'use client' file under src/ for
# process.env.NEXT_PUBLIC_*: the only three references
# (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL)
# all live in server-only files (src/lib/supabase/server.ts,
# src/lib/supabase/service.ts, src/app/api/groups/route.ts) and no browser
# Supabase client exists. None get inlined into the client bundle, so they can
# be supplied purely at container runtime via docker-compose's env_file.
# If a client component ever reads one directly, add it here as:
#   ARG NEXT_PUBLIC_X
#   ENV NEXT_PUBLIC_X=$NEXT_PUBLIC_X
FROM node:24-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---- runner ------------------------------------------------------------
# Prisma (v7, `provider = "prisma-client"` + @prisma/adapter-pg driver
# adapters) generates plain TypeScript/JS clients with no native query-engine
# binary (verified: no .node/.wasm files under src/generated). Those files are
# compiled straight into the Next.js server bundle by `next build`, so
# next's standalone output tracing carries them automatically — nothing
# extra to copy for Prisma. bcrypt's native addon is a real node_modules
# runtime dependency and IS covered by standalone tracing since it was
# compiled against this same node:24-slim base in the deps stage.
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
