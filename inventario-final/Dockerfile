FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
