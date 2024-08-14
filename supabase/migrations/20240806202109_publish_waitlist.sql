create table
  public.publish_waitlist (
    id bigint primary key generated always as identity,
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    created_at timestamp
    with
      time zone not null default now ()
  );

alter table public.publish_waitlist enable row level security;

create policy "Users can only see their own waitlist record." on public.publish_waitlist for
select
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy "Users can only insert their own waitlist record." on public.publish_waitlist for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy "Users can only delete their own waitlist record." on public.publish_waitlist for delete to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
);