FROM oven/bun:latest AS build

WORKDIR /app

COPY package.json bun.lock* ./
COPY frontend ./frontend
COPY backend ./backend

RUN bun install --frozen-lockfile

WORKDIR /app/backend

RUN bun run prisma:generate

WORKDIR /app/frontend

ENV NODE_ENV=production

RUN bun run build


FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80