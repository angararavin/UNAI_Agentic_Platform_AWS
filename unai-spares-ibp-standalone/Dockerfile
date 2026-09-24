FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY server.js engine.js llm.js ./
COPY adapters/ ./adapters/
COPY data/ ./data/
COPY public/ ./public/
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
