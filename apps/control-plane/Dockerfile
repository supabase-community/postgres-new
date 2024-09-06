FROM node:22-alpine

WORKDIR /app

COPY --link package.json ./
COPY --link src/ ./src/

RUN npm install

EXPOSE 80

CMD ["node", "--experimental-strip-types", "src/index.ts"]
