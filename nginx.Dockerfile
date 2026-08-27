FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend-backup/package.json frontend-backup/package-lock.json ./
RUN npm ci

COPY frontend-backup/ .
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
