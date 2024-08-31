FROM node:22 AS build-app
WORKDIR /app
COPY --link package.json tsup.config.ts ./
COPY --link src/ ./src/
RUN npm install
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12
ENV NODE_ENV=production
COPY --from=build-app /app/dist /app
WORKDIR /app
EXPOSE 5432
CMD ["--experimental-default-type=module", "index.js"]