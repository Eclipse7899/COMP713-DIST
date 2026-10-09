FROM oven/bun:alpine AS base

WORKDIR /app

FROM base AS build

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd ./shared prisma:generate

ENV NODE_ENV=production

RUN bun build ./backend/src/index.ts --outdir ./dist --target bun

FROM base AS release

RUN apk add --no-cache curl

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production

USER bun
EXPOSE 3000

ENTRYPOINT ["bun", "./dist/index.js"]