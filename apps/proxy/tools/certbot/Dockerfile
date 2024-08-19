# syntax = docker/dockerfile:1

# Adjust CERTBOT_VERSION as desired
ARG CERTBOT_VERSION=2.11.0
FROM certbot/dns-cloudflare:v${CERTBOT_VERSION} as base

WORKDIR /app

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

RUN git clone https://github.com/supabase/s3fs-fuse.git --depth 1 --branch s3/support-endpoint-with-uris && \
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
  curl \
  fuse \
  libxml2

COPY --from=build-s3fs /usr/local/bin/s3fs /usr/local/bin/s3fs
COPY certbot.sh deploy-hook.sh entrypoint.sh /app/

RUN chmod +x certbot.sh
RUN chmod +x deploy-hook.sh

ENTRYPOINT [ "./entrypoint.sh" ]

CMD [ "./certbot.sh" ]
