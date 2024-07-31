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

## Deploying to fly.io

1. Create a new app if it doesn't exist

```shell
flyctl apps create postgres-new-certbot
```

2. Build and deploy the Docker image to fly.io image registry

```shell
flyctl deploy --build-only --push -a postgres-new-certbot --image-label
 latest
```

3. Set the appropriate environment variables and secrets for the app "postgres-new-certbot" (see `.env.example`) in fly.io UI (available in Bitwarden as a secure note "fly.io postgres.new cerbot .env")

4. Setup [cron-manager](https://github.com/fly-apps/cron-manager?tab=readme-ov-file#getting-started) to run the certbot service every 2 weeks with the following `schedules.json`:

```json
[
  {
      "name": "postgres-new-certbot",
      "app_name": "postgres-new-certbot",
      "schedule": "0 0 1,15 * *",
      "region": "ord",
      "command": "./certbot.sh",
      "command_timeout": 120,
      "enabled": true,
      "config": {
          "metadata": {
              "fly_process_group": "cron"
          },
          "auto_destroy": true,
          "disable_machine_autostart": true,
          "guest": {
              "cpu_kind": "shared",
              "cpus": 1,
              "memory_mb": 256
          },
          "image": "registry.fly.io/postgres-new-certbot:latest",
          "restart": {
              "max_retries": 1,
              "policy": "no"
          }
      }
  }
]
```

5. Test running the job by SSHing into cron-manager console

Run this command in the cron-manager root folder:

```shell
flyctl ssh console
```

Once in the cron-manager instance:

```shell
cm jobs trigger 1
```

If you open the "postgres-new-certbot" live logs in fly.io UI, you should see the job being executed.

6. You can check if the certificates are present in the Tigris bucket

Run this command in the apps/db-instance folder:

```shell
flyctl storage dashboard
```

It should open the Tigris dashboard where you can check the bucket's content. The certificates should be created under `/tls`.