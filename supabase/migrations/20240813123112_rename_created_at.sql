-- Add a new 'deployed_at' column to the 'deployed_databases' table
alter table public.deployed_databases
add column deployed_at timestamp with time zone not null default now();