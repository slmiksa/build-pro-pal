create table if not exists public.org_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  org_name text not null default 'درع',
  allowed_domains text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.org_settings to authenticated;
grant all on public.org_settings to service_role;

alter table public.org_settings enable row level security;

create policy "signed-in read org settings" on public.org_settings
  for select to authenticated using (true);
create policy "admins insert org settings" on public.org_settings
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admins update org settings" on public.org_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create trigger org_settings_updated_at before update on public.org_settings
  for each row execute function public.update_updated_at_column();

insert into public.org_settings (singleton, allowed_domains)
values (true, '{}'::text[])
on conflict (singleton) do nothing;