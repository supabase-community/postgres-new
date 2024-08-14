# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.4.0
FROM node:${NODE_VERSION}-bookworm as base

LABEL fly_launch_runtime="NodeJS"

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Build S3FS
FROM base as build-s3fs

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    libfuse-dev

RUN git clone https://github.com/s3fs-fuse/s3fs-fuse.git --branch v1.94 && \
    cd s3fs-fuse && \
    ./autogen.sh && \
    ./configure && \
    make && \
    make install

# Build app
FROM base as build-app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y \
    python-is-python3 \
    pkg-config \
    build-essential 

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
RUN apt-get update && \
    apt-get install -y \
    fuse \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build-s3fs /usr/local/bin/s3fs /usr/local/bin/s3fs
# We copy the root node_modules
COPY --from=build-app /app/node_modules /app/node_modules
# We copy the db-service folder
COPY --from=build-app /app/apps/db-service /app/db-service

EXPOSE 5432

ENTRYPOINT [ "./db-service/entrypoint.sh" ]

# Start the server by default, this can be overwritten at runtime
CMD [ "node", "db-service/dist/index.js" ]
