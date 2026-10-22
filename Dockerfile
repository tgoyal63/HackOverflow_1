FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ .

EXPOSE 8082

CMD ["node", "index.js"]
