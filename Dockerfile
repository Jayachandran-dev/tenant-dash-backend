# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Build / Prisma generate ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts* ./
# Generate Prisma client (needs schema; DATABASE_URL can be dummy for generate)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
COPY src ./src

# ---- Production image ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts* ./
COPY src ./src

# Render and most hosts inject PORT
ENV PORT=5000
EXPOSE 5000

# Run migrations/push is optional at start — prefer running separately in prod
CMD ["node", "src/index.js"]