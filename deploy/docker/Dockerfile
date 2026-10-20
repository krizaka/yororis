# Yororis QA app (apps/web, Next.js standalone) — built by DigitalOcean App Platform from the repository root, and by CI (job
# "Container image") to prove it builds. QA-only: docs/FRAMEWORK.md §5. Nothing in this image is a secret; they arrive at run time.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /repo/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/web ./
ARG APP_COMMIT_SHA=""
# Build-time placeholders only (the app reads its configuration when it starts, never from the image); they stay in this stage.
ENV APP_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 AUTH_SESSION_SECRET=build-only-placeholder-not-a-secret-000000 AUTH_DEMO_PASSWORD=build-only-placeholder
RUN npm run build \
 && node -e "const v=require('./package.json').version; const s=process.env.APP_COMMIT_SHA.slice(0,7); process.stdout.write(s ? v+'+'+s : v+'+unknown')" > .next/standalone/VERSION

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
RUN addgroup -S yororis && adduser -S yororis -G yororis
COPY --from=build --chown=yororis:yororis /repo/apps/web/.next/standalone ./
COPY --from=build --chown=yororis:yororis /repo/apps/web/.next/static ./.next/static
USER yororis
EXPOSE 8080
# The version that runs is `X.Y.Z+sha`, read from the file the build wrote.
CMD ["sh", "-c", "APP_VERSION=$(cat VERSION) exec node server.js"]
