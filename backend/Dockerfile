FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS build

COPY package.json bun.lock* ./

RUN bun install

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

ENV NODE_ENV=production

RUN bun run prisma:generate
RUN bun build ./src/index.ts --outdir ./dist --target bun

FROM base AS release

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/src ./src

ENV NODE_ENV=production

USER bun
EXPOSE 3000

ENTRYPOINT ["bun", "run", "dist/index.js"]