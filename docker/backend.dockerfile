FROM node:20-alpine

WORKDIR /app/backend

# Copy package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev --no-optional --legacy-peer-deps

# Copy source
COPY backend/src ./src

USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5000/ready || exit 1

# Start server
CMD ["npm", "start"]
