create extension pg_cron with schema extensions;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule (
  'proxy-certificate',
  -- every Sunday at 00:00
  '0 0 * * 0',
  $$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url' limit 1) || '/functions/v1/proxy-certificate',
    headers:=('{"Content-Type": "application/json", "Authorization": "Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_functions_proxy_certificate_secret' limit 1) || '"}')::jsonb
  ) as request_id;
  $$
);