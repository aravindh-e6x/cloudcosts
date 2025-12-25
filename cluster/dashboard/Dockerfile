FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy laminar-ui first (it's a local dependency)
COPY laminar-ui ./laminar-ui

# Copy package files and install
COPY package.json ./
# Update the laminar-ui path to be local
RUN sed -i 's|file:../../ingestion/laminar-frontend/component-library|file:./laminar-ui|g' package.json
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/laminar-ui ./laminar-ui
COPY . .
# Restore the modified package.json (sed'd version points to ./laminar-ui)
COPY --from=deps /app/package.json ./package.json
# Copy laminar-ui to node_modules (symlinks don't work well with TypeScript)
RUN rm -rf node_modules/laminar-ui && cp -r laminar-ui node_modules/laminar-ui

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars (will be overridden at runtime)
ENV GREPTIMEDB_URL=http://placeholder:4000
ENV GREPTIMEDB_USERNAME=placeholder
ENV GREPTIMEDB_PASSWORD=placeholder

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
