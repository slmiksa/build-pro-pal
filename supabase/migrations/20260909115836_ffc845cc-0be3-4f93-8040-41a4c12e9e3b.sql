create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_create_member(
  _email text, _password text, _name text, _title text default 'مدير'
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare new_id uuid; clean_email text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  clean_email := lower(trim(_email));
  if clean_email is null or position('@' in clean_email) = 0 then
    raise exception 'invalid_email';
  end if;
  if _password is null or length(_password) < 8 or length(_password) > 72 then
    raise exception 'invalid_password';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = clean_email) then
    raise exception 'email_exists';
  end if;

  new_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    clean_email, extensions.crypt(_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('name', coalesce(nullif(trim(_name),''), split_part(clean_email,'@',1)),
                       'title', coalesce(nullif(trim(_title),''), 'مدير'),
                       'email_verified', true),
    now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_id, new_id::text,
    jsonb_build_object('sub', new_id::text, 'email', clean_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return new_id;
end;
$$;

create or replace function public.admin_set_member_password(_user_id uuid, _password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;
  if _password is null or length(_password) < 8 or length(_password) > 72 then
    raise exception 'invalid_password';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = _user_id;

  return found;
end;
$$;

revoke all on function public.admin_create_member(text, text, text, text) from public, anon;
revoke all on function public.admin_set_member_password(uuid, text) from public, anon;
grant execute on function public.admin_create_member(text, text, text, text) to authenticated;
grant execute on function public.admin_set_member_password(uuid, text) to authenticated;