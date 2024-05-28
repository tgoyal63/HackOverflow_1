FROM node:21

WORKDIR /app

COPY server/ .

RUN npm install

EXPOSE 8000

CMD ["node", "index.js"]
