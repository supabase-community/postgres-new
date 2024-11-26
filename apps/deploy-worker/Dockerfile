FROM node:22-alpine AS base

FROM base AS builder

WORKDIR /app

RUN npm install -g turbo@^2
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace.
RUN turbo prune @database.build/deploy-worker --docker

FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN npm install

# Build the project
COPY --from=builder /app/out/full/ .
RUN npx turbo run build --filter=@database.build/deploy-worker

FROM base AS runner

RUN apk add --no-cache postgresql16-client

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

COPY --from=installer --chown=nodejs:nodejs /app /app

WORKDIR /app/apps/deploy-worker

EXPOSE 443
EXPOSE 5432

CMD ["node", "--experimental-strip-types", "src/index.ts"]