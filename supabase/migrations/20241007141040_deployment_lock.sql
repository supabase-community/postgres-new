-- modify the deployment_status enum to include 'expired'
alter type deployment_status add value if not exists 'expired';

-- add deployed_at column
alter table deployments add column if not exists deployed_at timestamptz;

-- add an index to improve query performance
create index if not exists idx_deployments_status_database on deployments (status, deployed_database_id);

-- function to acquire a deployment lock
create or replace function acquire_deployment_lock(
  p_deployed_database_id bigint
) returns bigint as $$
declare
  v_deployment_id bigint;
begin
  -- check if there's an in-progress deployment for this database
  if exists (
    select 1 from deployments 
    where deployed_database_id = p_deployed_database_id and status = 'in_progress'
  ) then
    return null; -- deployment already in progress
  end if;

  -- create a new deployment record with 'in_progress' status
  insert into deployments (deployed_database_id, status)
  values (p_deployed_database_id, 'in_progress')
  returning id into v_deployment_id;
  
  return v_deployment_id;
end;
$$ language plpgsql;

-- function to clean up expired locks
create or replace function cleanup_expired_deployment_locks() returns void as $$
begin
  update deployments
  set status = 'expired'
  where status = 'in_progress' and created_at < now() - interval '10 minutes';
end;
$$ language plpgsql;

-- schedule the cleanup function to run every 10 minutes
select cron.schedule('*/5 * * * *', 'select cleanup_expired_deployment_locks()');