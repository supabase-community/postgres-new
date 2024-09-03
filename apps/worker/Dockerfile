FROM node:22-alpine

WORKDIR /app

COPY --link package.json ./
COPY --link src/ ./src/
COPY --link electric-sql-pglite-0.2.5.tgz ./

RUN npm install

EXPOSE 5432

CMD ["node", "--experimental-strip-types", "src/index.ts"]
