FROM node:20

COPY ./server/package*.json ./

WORKDIR /opt/server/hackoverflow-backend

COPY ./server .

RUN npm install
EXPOSE 9000
CMD [ "node", "index.js" ]
