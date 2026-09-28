FROM node:20-alpine

WORKDIR /app/backend

# Copy package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm install --no-optional --legacy-peer-deps

# Copy source
COPY backend/src ./src

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start server
CMD ["npm", "start"]
