# syntax = docker/dockerfile:1

# Adjust CERTBOT_VERSION as desired
ARG CERTBOT_VERSION=2.11.0
FROM certbot/dns-cloudflare:v${CERTBOT_VERSION} as base

# Set production environment
# ENV NODE_ENV=production

# Build S3FS
FROM base as build-s3fs

# Install dependencies
RUN apk add --no-cache \
  git \
  build-base \
  automake \
  autoconf \
  libxml2-dev \
  fuse-dev \
  curl-dev

RUN git clone https://github.com/s3fs-fuse/s3fs-fuse.git --branch v1.94 && \
  cd s3fs-fuse && \
  ./autogen.sh && \
  ./configure && \
  make && \
  make install

# Final stage
FROM base

# Install dependencies
RUN apk add --no-cache \
  bash \
  fuse

COPY --from=build-s3fs /usr/local/bin/s3fs /usr/local/bin/s3fs

ENTRYPOINT [ "./entrypoint.sh" ]

CMD [ "./certbot.sh" ]
