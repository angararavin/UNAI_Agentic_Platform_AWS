FROM node:22-slim
WORKDIR /app
COPY package.json ./
# better-sqlite3 is an optionalDependency — if it can't build without native
# toolchain in this slim image, npm skips it and server.js falls back to
# in-memory adapters automatically. Fine for a demo; add build-essential +
# python3 to this image later if persistent SQLite is actually needed.
RUN npm install --omit=dev --no-audit --no-fund || true
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
