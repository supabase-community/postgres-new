# Certbot

This service is responsible for managing the certificates for the PGLite instances.

Let's Encrypt certificates are valid for 90 days.

It uses `fly machine run --schedule monthly` to wake up the service every month to renew the certificates.

We use the `--dns-cloudflare` plugin to renew the certificates.

## Testing certbot

```shell
docker run -it --rm --name certbot certbot/dns-cloudflare \
certonly -d postgres.new --email hi@jgoux.dev --agree-tos --non-interactive \
--dns-cloudflare
```