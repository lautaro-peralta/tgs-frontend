# Multi-stage Dockerfile for TGS Frontend

# ============================================================================
# Stage 1: Build stage
# ============================================================================
# Angular 20 pide Node ^20.19 || ^22.12 || ^24, así que no sirve la imagen 18
# que usa el backend.
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.20.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for build)
# Playwright trae Chromium aparte y aquí no se ejecutan tests de navegador:
# sin esto el postinstall se descarga ~150 MB que la imagen no usa.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Angular app (configuración de producción por defecto en angular.json)
RUN pnpm build

# ============================================================================
# Stage 2: Production stage
# ============================================================================
FROM nginx:1.27-alpine AS production

# Nginx sirve el estático y hace de proxy hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# El builder de Angular deja el bundle del navegador en dist/<proyecto>/browser
COPY --from=builder /app/dist/The-Garrison-System/browser /usr/share/nginx/html

# Expose application port
EXPOSE 80

# Health check
# El mismo wget que espera el healthcheck de docker-compose.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
