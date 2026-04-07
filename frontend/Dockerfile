# Stage 1 — install dependencies (separate layer for caching)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Stage 2 — build
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use a placeholder so the built image can be configured at runtime
# via docker-entrypoint.sh without rebuilding.
# For local builds, override with: --build-arg NEXT_PUBLIC_SERVICE=http://...
ARG NEXT_PUBLIC_SERVICE=__NEXT_PUBLIC_SERVICE__
ENV NEXT_PUBLIC_SERVICE=$NEXT_PUBLIC_SERVICE

RUN yarn build

# Stage 3 — minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
