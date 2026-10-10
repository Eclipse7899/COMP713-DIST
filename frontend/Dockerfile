FROM oven/bun:alpine AS build

RUN apk add --no-cache protoc

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run generate

WORKDIR /app/frontend

ENV NODE_ENV=production

RUN bun run build

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80