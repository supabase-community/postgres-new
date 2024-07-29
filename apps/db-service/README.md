# DB Service

This service is still WIP. It uses [`s3fs`](https://github.com/s3fs-fuse/s3fs-fuse) to mount an S3-compatible storage to `/mnt/s3` then serve PGlite instances via the PGDATA that lives under `/mnt/s3/dbs/<id>`.

It also requires TLS certs, since we use SNI to reverse proxy DB connections (eg. `12345.db.example.com` serves `/mnt/s3/dbs/12345`). These certs live under `/mnt/s3/tls`.

## TODO

- [x] Containerize
- [ ] Connect to Supabase DB to validate creds/dbs
- [ ] DB versioning
- [ ] PGlite upload service

## Development

### Without `s3fs`

If want to develop locally without dealing with containers or underlying storage:

1. Generate certs that live under `./tls`:
   ```shell
   npm run generate:certs
   ```
1. Run the `pg-gateway` server:
   ```shell
   npm run dev
   ```
   All DBs will live under `./dbs`.
1. Connect to the server via `psql`:

   ```shell
   psql "host=localhost port=5432 user=postgres"
   ```

   or to test a real database ID, add a loopback entry to your `/etc/hosts` file:

   ```
    # ...

    127.0.0.1 12345.db.example.com
   ```

   and connect to that host:

   ```shell
   psql "host=12345.db.example.com port=5432 user=postgres"
   ```

### With `s3fs`

To simulate an environment closer to production, you can test the service with DBs backed by `s3fs` using Minio and Docker.

1. Start Minio as a local s3-compatible server:
   ```shell
   docker compose up -d minio
   ```
1. Initialize test bucket:
   ```shell
   docker compose up minio-init
   ```
   This will run to completion then exit.
1. Initialize local TLS certs:

   ```shell
   docker compose up --build tls-init
   ```

   This will build the container (if it's not cached) then run to completion and exit. Certs are stored under `/mnt/s3/tls`.

1. Run the `pg-gateway` server:
   ```shell
   docker compose up --build db-service
   ```
   This will build the container (if it's not cached) then run the Node `db-service`. All DBs will live under `/mnt/s3/dbs`.
1. Connect to the server via `psql`:

   ```shell
   psql "host=localhost port=5432 user=postgres"
   ```

   > Note the very first time a DB is created will be very slow (`s3fs` writes are slow with that many file handles) so expect this to hang for a while. Subsequent requests will be much quicker. This is temporary anyway - in the future the DB will have to already exist in `/mnt/s3/dbs/<id>` in order to connect.

   or to test a real database ID, add a loopback entry to your `/etc/hosts` file:

   ```
    # ...

    127.0.0.1 12345.db.example.com
   ```

   and connect to that host:

   ```shell
   psql "host=12345.db.example.com port=5432 user=postgres"
   ```

To stop all Docker containers, run:

```shell
docker compose down
```
