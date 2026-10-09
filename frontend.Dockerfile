FROM oven/bun:latest AS build

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run --cwd ./shared prisma:generate

ENV NODE_ENV=production

RUN bun run --cwd ./frontend build

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80