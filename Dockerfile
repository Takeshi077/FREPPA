FROM node:20

# Chrome dependencies required by Puppeteer for PDF report-card generation.
# `node:20` is Debian-based; Chrome for Testing is downloaded during `npm install`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgdk-pixbuf-2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies first (better layer caching)
COPY backend/package.json backend/package-lock.json* ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy application source
WORKDIR /app
COPY backend ./backend
COPY app ./app

# Multer writes bulk-upload temp files here
RUN mkdir -p /app/backend/uploads

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "server.js"]