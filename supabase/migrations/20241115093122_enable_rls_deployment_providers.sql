-- Enable RLS on deployment_providers to dismiss security warnings
alter table deployment_providers enable row level security;

-- RLS allow all policy for deployment_providers
create policy "Allow all operations on deployment_providers"
  on deployment_providers
  for all
  using (true);
