# syntax=docker/dockerfile:1

# Three stages: dependencies, build (also used as the migration image), and a lean
# runtime that ships only the Next.js standalone server.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, so the client is built against the schema
# copied above rather than at container start.
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time placeholders: the env parser runs while pages are collected, but
# nothing connects and nothing is signed here. Both are supplied for real by
# compose at run time.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV SESSION_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

# The builder stage doubles as the migration image: it is the only place with the
# Prisma CLI, tsx and the seed script. Keeping it out of the runtime image means
# the running application ships no migration tooling and no dev dependencies.

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
