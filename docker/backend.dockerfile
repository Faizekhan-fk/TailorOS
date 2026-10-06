FROM node:20-alpine

WORKDIR /app/backend

# Copy package files
COPY backend/package.json ./

# Install dependencies
RUN npm install --no-optional --legacy-peer-deps

# Copy source
COPY backend/src ./src

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5000/health || exit 1

# Start server
CMD ["npm", "start"]
