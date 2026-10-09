FROM oven/bun:alpine

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run --cwd ./shared prisma:generate

CMD ["sh", "-c", "bun run --cwd ./shared prisma generate && bun run --cwd ./shared prisma migrate deploy && bun run --cwd ./shared prisma db seed"]