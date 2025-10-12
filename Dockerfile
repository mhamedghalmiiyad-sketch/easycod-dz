FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix

# Copy the built application
COPY --from=builder --chown=remix:nodejs /app/build ./build
COPY --from=builder --chown=remix:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=remix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=remix:nodejs /app/public ./public
COPY --from=builder --chown=remix:nodejs /app/server.js ./server.js
RUN chmod +x ./server.js

# Install only production dependencies for the final image
RUN npm ci --omit=dev && npm cache clean --force

# Create a startup script before switching to remix user
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Environment variables:"' >> /app/start.sh && \
    echo 'env | grep SHOPIFY' >> /app/start.sh && \
    echo 'echo "Starting app..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting server on 0.0.0.0:8080..."' >> /app/start.sh && \
    echo 'npm run start' >> /app/start.sh && \
    chmod +x /app/start.sh

USER remix

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

# Environment variables will be set by Render

# Run the startup script
CMD ["/app/start.sh"]
