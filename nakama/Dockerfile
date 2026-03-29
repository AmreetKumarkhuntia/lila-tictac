FROM node:20-alpine AS build
WORKDIR /app
COPY nakama/package.json nakama/package-lock.json* ./
RUN npm ci
COPY nakama/tsconfig.json ./
COPY nakama/modules/ ./modules/
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.38.0
COPY --from=build /app/build/ /nakama/data/modules/build/
