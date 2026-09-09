# Multi-stage build for optimized production image
FROM node:22-alpine AS base

# Builder stage
FROM base AS builder

WORKDIR /app

# Set environment variables for build
ENV HUSKY=0
ENV NODE_ENV=production

# Copy package files first for better caching
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Prune dev dependencies to keep only production deps
RUN npm prune --production

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy pruned production dependencies and built app
COPY --from=builder --chown=nestjs:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=nestjs:nodejs /app/yarn.lock /app/yarn.lock
COPY --from=builder --chown=nestjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist /app/dist

# Set production environment
ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=8080

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "/app/dist/main.js"]
