FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium \
    WWEBJS_AUTH_PATH=/data/wwebjs_auth \
    PORT=3100 \
    NODE_ENV=production

COPY package.json package-lock.json* ./
COPY scripts ./scripts
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3100
VOLUME ["/data"]

CMD ["npm", "start"]
