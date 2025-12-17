############################
# 1. Build stage
############################
FROM node:24-bullseye AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

############################
# 2. Runtime stage
############################
FROM node:24-bullseye-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json yarn.lock ./

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    && yarn install --frozen-lockfile --production \
    && yarn cache clean \
    && apt-get remove -y python3 make g++ pkg-config \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist

# Create data directory for database and config
RUN mkdir -p /app/data

EXPOSE 3002

CMD ["node", "dist/main.js", "config=/app/data/config.yaml"]