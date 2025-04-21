FROM node:18.20.6

WORKDIR /app

COPY . .

RUN npm install
RUN npm rebuild better-sqlite3

RUN npm run build
RUN rm -rf ./src

EXPOSE 3002

CMD ["node", "/app/dist/main.js", "config=/config/config.yaml"]