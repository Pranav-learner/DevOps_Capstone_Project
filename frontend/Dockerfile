# ==========================================
# Stage 1: Build the React Application
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package manifests first for optimal caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source and compile production bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve Assets with Unprivileged Nginx
# ==========================================
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
