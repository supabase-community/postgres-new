# Proxy Certificate function

This function manages the SSL certificate for the proxy. The certificate is delivered by Let's Encrypt and stored in Supabase Storage under the `tls` directory.

When the certificate is about to expire (less than 30 days), the function will renew it.

## Setup

This function requires all these extensions to be enabled:

- `pg_cron`
- `pg_net`
- `vault`

The cron job relies on two secrets being present in Supabase Vault:

```sql
select vault.create_secret('<supabase_url>', 'supabase_url', 'Supabase API URL');
select vault.create_secret(encode(gen_random_bytes(24), 'base64'), 'supabase_functions_proxy_certificate_secret', 'Shared secret to trigger the "proxy-certificate" Supabase Edge Function');
```

Now you can schedule a new weekly cron job with `pg_cron`:

```sql
select cron.schedule (
  'proxy-certificate',
  -- every Sunday at 00:00
  '0 0 * * 0',
  $$
  select net.http_post(
    url:=(select supabase_url() || '/functions/v1/proxy-certificate'),
    headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select supabase_functions_proxy_certificate_secret()) || '"}')::jsonb
  ) as request_id;
  $$
);
```

If you immediately want a certificate for the proxy, you can call the Edge Function manually:

```sql
select net.http_post(
  url:=(select supabase_url() || '/functions/v1/proxy-certificate'),
  headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select supabase_functions_proxy_certificate_secret()) || '"}')::jsonb
) as request_id;
```