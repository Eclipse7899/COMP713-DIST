FROM oven/bun:alpine

RUN apk add --no-cache protoc

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run generate

CMD ["sh", "-c", "bun run --cwd ./backend prisma migrate deploy && bun run --cwd ./backend prisma db seed"]