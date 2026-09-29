# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g npm@11

COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` loads every route module to collect page data; src/lib/db/pool.ts builds its pg.Pool at import
# and throws without DATABASE_URL. A placeholder for this one command only: the pool never connects during the
# build, and the value is not in the runtime image (production sets DATABASE_URL in the Dokploy environment).
RUN DATABASE_URL=postgres://build-placeholder@127.0.0.1:1/build-placeholder npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Pre-create the uploads directory so the bind-mounted volume inherits
# the runtime user's ownership on first boot.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
