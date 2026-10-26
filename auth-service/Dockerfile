FROM oven/bun:alpine AS base

WORKDIR /app

FROM base AS build

RUN apk add --no-cache protoc

COPY . .

WORKDIR /app/auth-service

RUN bun install --frozen-lockfile
RUN bun run prisma:generate
RUN bun run proto:generate

ENV NODE_ENV=production

RUN bun build src/index.ts --compile --outfile app

FROM base AS release

RUN apk add --no-cache curl

COPY --from=build /app/auth-service/app ./

ENV NODE_ENV=production

USER bun
EXPOSE 5051

ENTRYPOINT ["./app"]