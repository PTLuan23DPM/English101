# Dockerfile (Cho Node.js Backend)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV ESLINT_NO_DEV_ERRORS=true
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb"

RUN npx prisma generate
RUN npm run build

COPY --from=builder /app/public ./public

# COPY STANDALONE (Quan trọng)
COPY --from=builder /app/.next/standalone ./

# COPY STATIC ASSETS (Bắt buộc)
COPY --from=builder /app/.next/static ./.next/static

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma 

EXPOSE 3000
CMD ["node", "server.js"]