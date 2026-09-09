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
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token,
    is_super_admin, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    clean_email, extensions.crypt(_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('name', coalesce(nullif(trim(_name),''), split_part(clean_email,'@',1)),
                       'title', coalesce(nullif(trim(_title),''), 'مدير'),
                       'email_verified', true),
    now(), now(),
    '', '', '', '', '', '', '', '',
    false, false, false
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

update auth.users
   set confirmation_token = coalesce(confirmation_token, ''),
       recovery_token = coalesce(recovery_token, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       email_change = coalesce(email_change, ''),
       phone_change = coalesce(phone_change, ''),
       phone_change_token = coalesce(phone_change_token, ''),
       reauthentication_token = coalesce(reauthentication_token, ''),
       is_super_admin = coalesce(is_super_admin, false),
       is_sso_user = coalesce(is_sso_user, false),
       is_anonymous = coalesce(is_anonymous, false)
 where confirmation_token is null
    or recovery_token is null
    or email_change_token_new is null
    or email_change_token_current is null
    or email_change is null
    or phone_change is null
    or phone_change_token is null
    or reauthentication_token is null
    or is_super_admin is null
    or is_sso_user is null
    or is_anonymous is null;