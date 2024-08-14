create table public.deployed_databases (
  id bigint primary key generated always as identity,
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  database_id text not null unique,
  name text not null,
  created_at timestamp with time zone not null,
  auth_method text not null,
  auth_data jsonb,
  deployed_at timestamp with time zone not null default now()
);

alter table public.deployed_databases enable row level security;

create policy "Users can only see their own deployed database records."
on public.deployed_databases
for select to authenticated
using (user_id = auth.uid());

create policy "Users can only insert their own deployed database records."
on public.deployed_databases
for insert to authenticated
with check (user_id = auth.uid());

create policy "Users can only update their own deployed database records."
on public.deployed_databases
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can only delete their own deployed database records."
on public.deployed_databases
for delete to authenticated
using (user_id = auth.uid());