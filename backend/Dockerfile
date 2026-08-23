FROM node:25.9-alpine AS build
LABEL authors="Eclipse7899"

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY ../backend .

RUN npx prisma generate
RUN npm run build

FROM node:25.9-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/src/main.js"]