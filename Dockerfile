FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Build Next.js production bundle
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Ensure runtime cache directory is writable by non-root HF Spaces user (uid 1000)
RUN mkdir -p /app/.next/cache && chmod -R 777 /app/.next

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

EXPOSE 7860

CMD ["npx", "next", "start", "-p", "7860", "-H", "0.0.0.0"]
