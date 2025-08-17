# Multi-stage build for React + Node.js app
FROM node:18-alpine as build-stage

# Build frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine as production-stage

WORKDIR /app

# Copy server package.json and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --only=production

# Copy built frontend
COPY --from=build-stage /app/dist ./dist

# Copy server files
COPY server/server.js ./server/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/server.js"]