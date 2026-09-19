# ============================================================
# Build Stage
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for environment-specific configuration
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Production Serving Stage with Nginx
# ============================================================
FROM nginx:alpine

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy built frontend assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
