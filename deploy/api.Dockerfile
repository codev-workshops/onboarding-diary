# Production image for @onboarding-diary/api (T-194).
# Build from the repository root:  docker build -f deploy/api.Dockerfile .

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV npm_config_ignore_scripts=false
# argon2 and the Prisma engines are compiled/downloaded during install.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @onboarding-diary/api --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @onboarding-diary/shared \
  && npm run build --workspace @onboarding-diary/api

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/apps/api apps/api
COPY deploy/api-entrypoint.sh /usr/local/bin/api-entrypoint
RUN chmod +x /usr/local/bin/api-entrypoint
USER node
EXPOSE 4000
# Migrations run on deploy, before the process starts serving.
ENTRYPOINT ["/usr/local/bin/api-entrypoint"]
