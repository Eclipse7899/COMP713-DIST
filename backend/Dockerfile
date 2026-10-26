FROM oven/bun:alpine AS base

WORKDIR /app

FROM base AS build

RUN apk add --no-cache protoc

COPY . .

WORKDIR /app/backend

RUN bun install --frozen-lockfile
RUN bun run prisma:generate
RUN bun run proto:generate

ENV NODE_ENV=production

RUN bun build src/index.ts --outdir ./dist --target bun

FROM base AS release

RUN apk add --no-cache curl

COPY --from=build /app/backend/dist ./dist

ENV NODE_ENV=production

USER bun
EXPOSE 3000

ENTRYPOINT ["bun", "./dist/index.js"]