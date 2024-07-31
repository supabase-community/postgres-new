# Certbot

This service is responsible for managing the certificates for the PGLite instances.

It uses `fly machine run --schedule weekly` to wake up the service every week to renew the certificates if needed. Let's Encrypt certificates are valid for 90 days.

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