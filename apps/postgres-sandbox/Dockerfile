ARG PG_MAJOR=16
ARG PGVECTOR_VERSION=v0.7.4

FROM postgres:${PG_MAJOR}-alpine
ARG PG_MAJOR
ARG PGVECTOR_VERSION

RUN apk add --no-cache build-base clang15 git llvm15 postgresql${PG_MAJOR}-dev && \
  git clone --depth 1 --branch ${PGVECTOR_VERSION} https://github.com/pgvector/pgvector.git /tmp/pgvector && \
  cd /tmp/pgvector && \
  make clean && \
  make OPTFLAGS="" && \
  make install && \
  mkdir -p /usr/share/doc/pgvector && \
  cp LICENSE README.md /usr/share/doc/pgvector && \
  apk del --no-cache build-base clang15 git llvm15 postgresql${PG_MAJOR}-dev && \
  rm -r /tmp/pgvector

COPY --chown=postgres:postgres ./postgresql.conf /etc/postgresql.conf
CMD [ "-c", "config_file=/etc/postgresql.conf" ]