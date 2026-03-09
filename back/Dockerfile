FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create necessary directories for file uploads
RUN mkdir -p files/tdr files/applicants archives

# Copy application source code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port your app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:8000/api/offers || exit 1

# Start the application
CMD ["node", "server.js"]
