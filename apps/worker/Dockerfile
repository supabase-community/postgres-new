FROM node:22-alpine AS build-app
WORKDIR /app
COPY --link package.json tsup.config.ts ./
COPY --link src/ ./src/
RUN npm install
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
RUN apk add --no-cache aws-cli
COPY --from=build-app /app/dist /app
COPY --link entrypoint.sh /app
WORKDIR /app
EXPOSE 5432
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "--experimental-default-type=module", "index.js"]