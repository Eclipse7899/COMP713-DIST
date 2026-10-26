FROM oven/bun:alpine

RUN apk add --no-cache protoc

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run generate

CMD ["sh", "-c", "bun run --cwd ./auth-service prisma migrate deploy && bun run --cwd ./auth-service prisma db seed"]