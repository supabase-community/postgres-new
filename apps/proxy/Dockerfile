FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --link ./src ./src
COPY --link ./package.json ./package.json

RUN sed -i '/"@postgres-new\/supabase": "\*"/d' package.json

RUN npm install

EXPOSE 5432
EXPOSE 2345

CMD [ "node", "--experimental-strip-types", "src/index.ts" ]