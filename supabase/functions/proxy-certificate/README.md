# Proxy Certificate function

This function manages the SSL certificate for the proxy. The certificate is delivered by Let's Encrypt and stored in Supabase Storage under the `tls` directory.

The function is triggered by a cron job on a weekly basis using the `pg_cron` extension.

When the certificate is about to expire (less than 30 days), the function will renew it.

## Setup

The cron job relies on two secrets being present in Supabase Vault:

```sql
select vault.create_secret('<supabase_url>', 'supabase_url', 'Supabase API URL');
select vault.create_secret(encode(gen_random_bytes(24), 'base64'), 'supabase_functions_proxy_certificate_secret', 'Shared secret to trigger the "proxy-certificate" Supabase Edge Function');
```

The cron job is scheduled as part of the migrations, you can call the Edge Function manually with `pg_net`:

```sql
select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url' limit 1) || '/functions/v1/proxy-certificate',
  headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_functions_proxy_certificate_secret' limit 1) || '"}')::jsonb
) as request_id;
```