FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS final
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist/web ./dist/web

USER node
CMD ["node", "dist/web/server/server.mjs"]
