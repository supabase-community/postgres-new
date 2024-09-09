# Certificate function

This function manages the SSL certificates for the various services. The certificate is delivered by Let's Encrypt and stored in Supabase Storage under the `tls/<domain>` directory.

When the certificate is about to expire (less than 30 days), the function will renew it.

## Setup

This function requires all these extensions to be enabled:

- `pg_cron`
- `pg_net`
- `vault`

The cron job relies on two secrets being present in Supabase Vault:

```sql
select vault.create_secret('<supabase_url>', 'supabase_url', 'Supabase API URL');
select vault.create_secret(encode(gen_random_bytes(24), 'base64'), 'supabase_functions_certificate_secret', 'Shared secret to trigger the "certificate" Supabase Edge Function');
```

Now you can schedule a new weekly cron job with `pg_cron`:

```sql
select cron.schedule (
  'certificates',
  -- every Sunday at 00:00
  '0 0 * * 0',
  $$
  -- certificate for the browser proxy
  select net.http_post(
    url:=(select supabase_url() || '/functions/v1/certificate'),
    headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select supabase_functions_certificate_secret()) || '"}')::jsonb,
    body:='{"domainName": "db.browser.db.build"}'::jsonb
  ) as request_id
  $$
);
```

If you immediately want a certificate, you can call the Edge Function manually:

```sql
select net.http_post(
  url:=(select supabase_url() || '/functions/v1/certificate'),
  headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select supabase_functions_certificate_secret()) || '"}')::jsonb,
  body:='{"domainName": "db.browser.db.build"}'::jsonb
) as request_id;
```