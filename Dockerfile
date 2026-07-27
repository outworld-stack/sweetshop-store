# # monolith 


# #stage 1 : build spa vite

# FROM node:22-bookworm-slim AS frontend-build
# WORKDIR /app/frontend
# COPY frontend/ ./

# ENV VITE_API_URL=

# ARG VITE_CLERK_PUBLISHABLE_KEY
# ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
# RUN npm install --no-audit --no-fund \
#     && npm run build


# # stage 2: compile API , ts to js

# FROM node:22-bookworm-slim AS backend-build
# WORKDIR /app
# COPY backend/ ./
# RUN npm install --no-audit --no-fund \
#     && npm run build


# # stage 3: runtime image

# FROM node:22-bookworm-slim AS runner
# WORKDIR /app
# ENV NODE_ENV=production

# COPY backend/package.json backend/package-lock.json ./
# RUN npm install --omit=dev --no-audit --no-fund && npm cache --force

# COPY --from=backend-build /app/dist ./dist
# COPY --from=frontend-build /app/frontend/dist ./public

# EXPOSE 3001
# USER node

# CMD ["node", "dist/index.js"]




# monolith

# stage 1 : ساخت SPA با Vite و Bun (استفاده از bun.lockb)
FROM oven/bun:debian AS frontend-build
WORKDIR /app/frontend
COPY frontend/ ./

ENV VITE_API_URL=

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# نصب وابستگی‌ها با قفل (چون bun.lockb وجود دارد)
RUN bun install --frozen-lockfile
RUN bun run build


# stage 2 : کامپایل بک‌اند (TS به JS) با Bun
FROM oven/bun:debian AS backend-build
WORKDIR /app
COPY backend/ ./

RUN bun install --frozen-lockfile
RUN bun run build


# stage 3 : تصویر نهایی برای اجرا با Bun (production)
FROM oven/bun:debian AS runner
WORKDIR /app
ENV NODE_ENV=production

# کپی فقط package.json و bun.lockb (نه package-lock.json)
COPY backend/package.json backend/bun.lockb ./

# نصب فقط وابستگی‌های production با استفاده از قفل
RUN bun install --production --frozen-lockfile && bun cache clean

# کپی خروجی‌های ساخته‌شده از مراحل قبل
COPY --from=backend-build /app/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

# کاربر پیش‌فرض در تصویر oven/bun، bun است
USER bun

# اجرای فایل اصلی با خود Bun
CMD ["bun", "dist/index.js"]