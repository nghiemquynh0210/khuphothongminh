FROM node:20-alpine AS base
WORKDIR /app

# Cài dependencies
COPY package*.json ./
RUN npm ci --frozen-lockfile

# ==================================
# Stage: Development
# ==================================
FROM base AS dev
COPY . .
EXPOSE 3000
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ==================================
# Stage: Build
# ==================================
FROM base AS builder
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# ==================================
# Stage: Production (Nginx)
# ==================================
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config cho SPA (React Router)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
