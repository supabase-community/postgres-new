FROM node:22-alpine

RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY --link package.json ./
COPY --link src/ ./src/

RUN npm install

EXPOSE 443
EXPOSE 5432

CMD ["node", "--experimental-strip-types", "src/index.ts"]