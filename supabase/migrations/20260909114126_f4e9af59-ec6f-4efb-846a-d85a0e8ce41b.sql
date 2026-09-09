create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.keepalive (
  id smallint primary key default 1,
  last_ping timestamptz not null default now(),
  pings bigint not null default 0,
  constraint keepalive_single_row check (id = 1)
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

grant select on public.keepalive to authenticated;
grant all on public.keepalive to service_role;

alter table public.keepalive enable row level security;

drop policy if exists "keepalive readable by authenticated" on public.keepalive;
create policy "keepalive readable by authenticated"
on public.keepalive for select to authenticated using (true);

create or replace function public.ping_keepalive()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.keepalive
    set last_ping = now(), pings = pings + 1
  where id = 1;

  perform extensions.http_get(
    'https://dhrrxcoapjcubxgtqqwm.supabase.co/rest/v1/keepalive?select=last_ping&limit=1',
    headers := jsonb_build_object(
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocnJ4Y29hcGpjdWJ4Z3RxcXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MjgwOTUsImV4cCI6MjEwNDUwNDA5NX0.DbChjr6LHrAHaycckny-r30OxpM3WHK_T2boqfnpahA'
    )
  );
end;
$$;

revoke all on function public.ping_keepalive() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'keepalive-ping';
select cron.schedule('keepalive-ping', '0 * * * *', $$select public.ping_keepalive();$$);