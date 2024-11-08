create extension if not exists moddatetime;

-- table for deployment providers
create table deployment_providers (
  id bigint primary key generated always as identity,
  name text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deployment_providers_updated_at before update on deployment_providers
  for each row execute procedure moddatetime (updated_at);

-- insert the first deployment provider: supabase
insert into deployment_providers (name) values ('Supabase');

-- table for storing deployment provider integrations
create table deployment_provider_integrations (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) default auth.uid(),
  deployment_provider_id bigint references deployment_providers(id),
  scope jsonb not null default '{}'::jsonb,
  credentials uuid references vault.secrets(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, deployment_provider_id, scope)
);

create trigger deployment_provider_integrations_updated_at before update on deployment_provider_integrations
  for each row execute procedure moddatetime (updated_at);

-- table for storing deployed databases
create table deployed_databases (
  id bigint primary key generated always as identity,
  local_database_id text not null,
  deployment_provider_integration_id bigint not null references deployment_provider_integrations(id),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(local_database_id, deployment_provider_integration_id)
);

create trigger deployed_databases_updated_at before update on deployed_databases
  for each row execute procedure moddatetime (updated_at);

create type deployment_status as enum ('in_progress', 'success', 'failed');

-- table for storing individual deployments
create table deployments (
  id bigint primary key generated always as identity,
  local_database_id text not null,
  status deployment_status not null default 'in_progress',
  deployed_database_id bigint references deployed_databases(id),
  events jsonb not null default '[]'::jsonb,
  user_id uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_deployments_in_progress
on deployments (local_database_id)
where status = 'in_progress';

create trigger deployments_updated_at before update on deployments
  for each row execute procedure moddatetime (updated_at);

-- Enable RLS on deployment_provider_integrations
alter table deployment_provider_integrations enable row level security;

-- RLS policies for deployment_provider_integrations
create policy "Users can read their own integrations"
  on deployment_provider_integrations for select
  using (auth.uid() = user_id);

create policy "Users can create their own integrations"
  on deployment_provider_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on deployment_provider_integrations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on deployment_provider_integrations for delete
  using (auth.uid() = user_id);

-- Enable RLS on deployed_databases
alter table deployed_databases enable row level security;

-- RLS policies for deployed_databases
create policy "Users can read their own deployed databases"
  on deployed_databases for select
  using (auth.uid() = (select user_id from deployment_provider_integrations where id = deployed_databases.deployment_provider_integration_id));

create policy "Users can create their own deployed databases"
  on deployed_databases for insert
  with check (auth.uid() = (select user_id from deployment_provider_integrations where id = deployment_provider_integration_id));

create policy "Users can update their own deployed databases"
  on deployed_databases for update
  using (auth.uid() = (select user_id from deployment_provider_integrations where id = deployed_databases.deployment_provider_integration_id))
  with check (auth.uid() = (select user_id from deployment_provider_integrations where id = deployment_provider_integration_id));

create policy "Users can delete their own deployed databases"
  on deployed_databases for delete
  using (auth.uid() = (select user_id from deployment_provider_integrations where id = deployed_databases.deployment_provider_integration_id));

-- Enable RLS on deployments
alter table deployments enable row level security;

-- RLS policies for deployments
create policy "Users can read their own deployments"
  on deployments for select
  using (auth.uid() = user_id);

create policy "Users can create their own deployments"
  on deployments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own deployments"
  on deployments for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      deployed_database_id is null
      or
      exists (
        select 1
        from deployed_databases dd
        join deployment_provider_integrations dpi on dd.deployment_provider_integration_id = dpi.id
        where dd.id = deployed_database_id
          and dpi.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own deployments"
  on deployments for delete
  using (auth.uid() = user_id);

create or replace function insert_secret(secret text, name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;
 
  return vault.create_secret(secret, name);
end;
$$;

create or replace function upsert_secret(secret text, name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  secret_id uuid;
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;

  -- check if the secret already exists and store the id
  select id into secret_id from vault.decrypted_secrets where vault.decrypted_secrets.name = upsert_secret.name;

  if secret_id is not null then
    -- If the secret exists, update it
    return vault.update_secret(secret_id, secret);
  else
    -- If the secret does not exist, create it
    return vault.create_secret(secret, name);
  end if;
end;
$$;

create or replace function update_secret(secret_id uuid, new_secret text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;
 
  return vault.update_secret(secret_id, new_secret);
end;
$$;

create function read_secret(secret_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  secret text;
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;
 
  select decrypted_secret from vault.decrypted_secrets where id =
  secret_id into secret;
  return secret;
end;
$$;

create function delete_secret(secret_id uuid)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if current_setting('role') != 'service_role' then
    raise exception 'authentication required';
  end if;
 
  with deleted as (
    delete from vault.secrets where id = secret_id
    returning *
  )
  select count(*) into deleted_count from deleted;
  
  return deleted_count;
end;
$$;
