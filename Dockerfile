# --- Giai đoạn 1: Deps ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# --- Giai đoạn 2: Builder ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bỏ qua check env để build không lỗi
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1

# QUAN TRỌNG: Chạy generate ở đây để tạo Client đúng chuẩn Linux
RUN npx prisma generate

RUN npm run build

# --- Giai đoạn 3: Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy file cần thiết
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# QUAN TRỌNG: Copy cả thư mục prisma (đã generate) sang runner
# Để lúc khởi động nó chạy được lệnh migrate deploy
COPY --from=builder /app/prisma ./prisma 

EXPOSE 3000
CMD ["node", "server.js"]