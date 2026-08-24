-- Most of this family already has an account in this database (Larder and
-- Laundry-HQ share its auth), and they sign in with Google, so there is no
-- signup form to carry hs_role metadata. A parent instead authorises an email
-- ahead of time; the first sign-in from that address claims the role.
create table if not exists hs_invites (
  email      text primary key,
  role       text not null check (role in ('parent','student')),
  student_id uuid references hs_students(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  check (role = 'parent' or student_id is not null)
);

alter table hs_invites enable row level security;

create policy hs_invites_parent on hs_invites
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- Extends the signup hook: metadata still wins (the email/password form), but
-- a signup without it now falls back to a pending invite for that address.
create or replace function hs_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role     text := new.raw_user_meta_data ->> 'hs_role';
  v_student  text := new.raw_user_meta_data ->> 'hs_student';
  v_code     text := new.raw_user_meta_data ->> 'hs_code';
  v_name     text := new.raw_user_meta_data ->> 'hs_display_name';
  v_expected text;
  v_matched  int;
  v_invite   hs_invites%rowtype;
begin
  if v_role is null then
    -- No homeschool metadata: this is an OAuth or another app's signup.
    select * into v_invite from hs_invites
     where lower(email) = lower(new.email) and claimed_at is null;
    if not found then
      return new;                                -- nothing to do with it
    end if;

    insert into hs_profiles (id, role, display_name)
    values (new.id, v_invite.role,
            coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                     nullif(new.raw_user_meta_data ->> 'name', ''),
                     split_part(new.email, '@', 1)))
    on conflict (id) do nothing;

    if v_invite.student_id is not null then
      update hs_students set user_id = new.id
       where id = v_invite.student_id and user_id is null;
    end if;

    update hs_invites set claimed_at = now() where email = v_invite.email;
    return new;
  end if;

  if v_role not in ('parent','student') then
    raise exception 'Invalid role';
  end if;

  select value into v_expected from hs_settings where key = 'signup_code';
  if v_expected is null or v_code is distinct from v_expected then
    raise exception 'That family code is not right.';
  end if;

  if v_role = 'student' then
    update hs_students
       set user_id = new.id
     where lower(name) = lower(coalesce(v_student, ''))
       and user_id is null;
    get diagnostics v_matched = row_count;
    if v_matched = 0 then
      raise exception 'No unclaimed student named %.', coalesce(v_student, '(none)');
    end if;
  end if;

  insert into hs_profiles (id, role, display_name)
  values (new.id, v_role, coalesce(nullif(v_name, ''), v_student, split_part(new.email, '@', 1)));

  return new;
end $$;

revoke all on function hs_handle_new_user() from anon, authenticated;

-- An invite created for someone who ALREADY has an account (the common case
-- here) has no signup to hook, so claim it on demand instead.
create or replace function hs_claim_invites() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_claimed int := 0;
  v_row     record;
begin
  if auth.uid() is not null and not hs_is_parent() then
    raise exception 'Only a parent can connect logins.';
  end if;

  for v_row in
    select i.email, i.role, i.student_id, u.id as user_id,
           coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''),
                    nullif(u.raw_user_meta_data ->> 'name', ''),
                    split_part(u.email, '@', 1)) as display_name
      from hs_invites i
      join auth.users u on lower(u.email) = lower(i.email)
     where i.claimed_at is null
  loop
    insert into hs_profiles (id, role, display_name)
    values (v_row.user_id, v_row.role, v_row.display_name)
    on conflict (id) do update set role = excluded.role;

    if v_row.student_id is not null then
      update hs_students set user_id = v_row.user_id where id = v_row.student_id;
    end if;

    update hs_invites set claimed_at = now() where email = v_row.email;
    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end $$;

revoke all on function hs_claim_invites() from anon, authenticated;
grant execute on function hs_claim_invites() to authenticated;

-- Lets a signed-in user claim an invite a parent left for their own address.
-- Only their own: the email comes from the JWT, never from an argument, and
-- an invite has to already exist for it.
create or replace function hs_claim_my_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text;
  v_meta   jsonb;
  v_invite hs_invites%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  if exists (select 1 from hs_profiles where id = v_uid) then
    return 'already';
  end if;

  select email, raw_user_meta_data into v_email, v_meta
    from auth.users where id = v_uid;
  if v_email is null then
    return null;
  end if;

  select * into v_invite from hs_invites
   where lower(email) = lower(v_email) and claimed_at is null;
  if not found then
    return null;
  end if;

  insert into hs_profiles (id, role, display_name)
  values (v_uid, v_invite.role,
          coalesce(nullif(v_meta ->> 'full_name', ''),
                   nullif(v_meta ->> 'name', ''),
                   split_part(v_email, '@', 1)))
  on conflict (id) do nothing;

  if v_invite.student_id is not null then
    update hs_students set user_id = v_uid
     where id = v_invite.student_id and user_id is null;
  end if;

  update hs_invites set claimed_at = now() where email = v_invite.email;
  return v_invite.role;
end $$;

revoke all on function hs_claim_my_invite() from anon, authenticated;
grant execute on function hs_claim_my_invite() to authenticated;
