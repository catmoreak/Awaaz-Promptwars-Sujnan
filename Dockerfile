FROM node:22-slim
WORKDIR /app
RUN corepack enable
COPY . .
# Baked into the website at build time, because .env files are not copied into the image.
ARG VITE_GOOGLE_MAPS_KEY
RUN pnpm install --frozen-lockfile && pnpm build
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["pnpm", "start"]
