FROM node:16 AS ui-build
WORKDIR /usr/src/app
COPY client/ ./client
RUN cd client && npm install && npm run build

FROM node:16 AS server-build
WORKDIR /root/
COPY --from=ui-build /usr/src/app/client/build ./client/build
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/index.js ./server/

EXPOSE 3001

CMD [ "node", "./server/index.js"]