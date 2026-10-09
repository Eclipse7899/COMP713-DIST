FROM oven/bun:alpine AS base

WORKDIR /app

FROM base AS build

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd ./shared prisma:generate

ENV NODE_ENV=production

RUN bun build ./auth-service/src/index.ts --compile --outfile app

FROM base AS release

RUN apk add --no-cache curl

COPY --from=build /app/app ./

ENV NODE_ENV=production

USER bun
EXPOSE 5051

ENTRYPOINT ["./app"]