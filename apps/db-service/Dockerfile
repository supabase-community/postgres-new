# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.4.0
FROM node:${NODE_VERSION}-bookworm as base

LABEL fly_launch_runtime="NodeJS"

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Build app
FROM base as build-app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y \
    python-is-python3 \
    pkg-config \
    build-essential 

# Install node modules
COPY --link package.json .
RUN npm install --production=false

# Copy application code
COPY --link . .

# Build app
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Final stage for app image
FROM base

# Download mountpoint-s3
RUN wget https://s3.amazonaws.com/mountpoint-s3-release/latest/arm64/mount-s3.deb

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    fuse \
    ./mount-s3.deb \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build-app /app /app

ENTRYPOINT [ "./entrypoint.sh" ]

# Start the server by default, this can be overwritten at runtime
CMD [ "node", "dist/index.js" ]
