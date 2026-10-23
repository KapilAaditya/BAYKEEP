# ============================================================================
# Baykeep — Multi-Stage Production Dockerfile
# Place this file in the project root directory (BAYKEEP/Dockerfile)
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Build the React (Vite + Tailwind CSS) Frontend
# ----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2: Production Frontend Server (Nginx)
# Build target: frontend
# ----------------------------------------------------------------------------
FROM nginx:stable-alpine AS frontend

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ----------------------------------------------------------------------------
# Stage 3: Production Backend Server (Node.js + Express)
# Build target: backend
# ----------------------------------------------------------------------------
FROM node:20-alpine AS backend

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

COPY inventory-backend/package.json inventory-backend/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY inventory-backend/ ./

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]