# Certbot

This service is responsible for managing the certificates for the PGLite instances.

The certificates are created on Let's Encrypt (valid for 90 days) and stored in a S3 bucket under the `/tls` path.

## Testing certbot-service locally

Copy `.env.example` to `.env` and set the missing environment variables.

Start minio to emulate the S3 service:

```shell
docker compose up -d minio    
```

Initialize the bucket:

```shell
docker compose up minio-init
```

Build and run the certbot service:

```shell
docker compose up --build certbot-service
```

The certificates will be generated in `/mnt/s3/tls`.

## Deploying to fly.io

1. Create a new app if it doesn't exist

```shell
fly apps create postgres-new-certbot
```

2. Build and deploy the Docker image to fly.io image registry

```shell
fly deploy --build-only --push --image-label latest
```

3. Set the appropriate environment variables and secrets for the app "postgres-new-certbot" (see `.env.example`) in fly.io UI.

4. Deploy the machine with a schedule

```shell
fly machine run registry.fly.io/postgres-new-certbot:latest "./certbot.sh" --region iad --schedule weekly
```

The machine will now be started weekly in order to renew the certificates.

