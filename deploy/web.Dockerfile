# Production image for @onboarding-diary/web (T-194): a Vite build served by nginx.
# `VITE_API_BASE_URL` is baked in at build time, so it is a build argument, not a runtime one.
# Build from the repository root:  docker build -f deploy/web.Dockerfile .

FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @onboarding-diary/web --include-workspace-root --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @onboarding-diary/shared \
  && npm run build --workspace @onboarding-diary/web

FROM nginx:1.29-alpine AS runtime
# The official image runs envsubst over /etc/nginx/templates at boot, which is how the API
# upstream is pointed at whatever host runs the API.
ENV API_UPSTREAM=api:4000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
