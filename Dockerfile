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

# DO NOT set NODE_ENV or PORT here - let Render handle these
# This prevents overriding Render's environment variables

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

# Create a startup script with comprehensive environment variable checking
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "=== Environment Variable Check ==="' >> /app/start.sh && \
    echo 'echo "NODE_ENV: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "PORT: $PORT"' >> /app/start.sh && \
    echo 'echo "SHOPIFY_API_KEY: ${SHOPIFY_API_KEY:+SET}"' >> /app/start.sh && \
    echo 'echo "SHOPIFY_API_SECRET: ${SHOPIFY_API_SECRET:+SET}"' >> /app/start.sh && \
    echo 'echo "SHOPIFY_APP_URL: $SHOPIFY_APP_URL"' >> /app/start.sh && \
    echo 'echo "SCOPES: ${SCOPES:+SET}"' >> /app/start.sh && \
    echo 'echo "================================="' >> /app/start.sh && \
    echo 'echo "Running database migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

USER remix

EXPOSE 8080

# Environment variables will be injected by Render at runtime
# DO NOT set any environment variables here that Render should control

# Run the startup script
CMD ["/app/start.sh"]
