# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base

LABEL fly_launch_runtime="NodeJS"

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Build S3FS
FROM base AS build-s3fs

# Install dependencies
RUN apk add --no-cache \
    autoconf \
    automake \
    build-base \
    curl-dev \
    fuse-dev \
    git \
    libxml2-dev

RUN git clone https://github.com/supabase/s3fs-fuse.git --branch s3/support-endpoint-with-uris && \
    cd s3fs-fuse && \
    ./autogen.sh && \
    ./configure && \
    make && \
    make install

# Build app
FROM base AS build-app

# Install packages needed to build node modules
RUN apk add --no-cache \
    python3 \
    pkgconfig \
    build-base

# Copy everything
COPY --link . .

# Install dependencies
RUN npm install -w @postgres-new/proxy --production=false

# Build app
RUN npm run -w @postgres-new/proxy build 

# Remove development dependencies
RUN npm prune -w @postgres-new/proxy --production

# Final stage for app image
FROM base

# Install dependencies
RUN apk add --no-cache \
    fuse \
    curl \
    libxml2 \
    gcompat

COPY --from=build-s3fs /usr/local/bin/s3fs /usr/local/bin/s3fs
# We copy the root node_modules
COPY --from=build-app /app/node_modules /app/node_modules
# We copy the package-lock.json for PGlite version detection
COPY --from=build-app /app/package-lock.json /app/package-lock.json
# We copy the proxy folder
COPY --from=build-app /app/apps/proxy /app/proxy

EXPOSE 5432

EXPOSE 80

ENTRYPOINT [ "./proxy/entrypoint.sh" ]

# Start the server by default, this can be overwritten at runtime
CMD [ "node", "proxy/dist/index.js" ]
