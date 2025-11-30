# --- Giai đoạn 1: Deps (Cài node_modules) ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
# Dùng npm install cho an toàn
RUN npm install

# --- Giai đoạn 2: Builder (Build Next.js) ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bỏ qua check env lúc build để tránh lỗi
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# --- Giai đoạn 3: Runner (Chạy App) ---
# BẮT BUỘC PHẢI KHAI BÁO GIAI ĐOẠN NÀY TRƯỚC KHI COPY
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Standalone Server (Code chính)
COPY --from=builder /app/.next/standalone ./

# Copy Static Assets (CSS/JS/Images)
# Lệnh này phải nằm TRONG giai đoạn runner
COPY --from=builder /app/.next/static ./.next/static

# Expose và chạy
EXPOSE 3000
CMD ["node", "server.js"]