-- Turns a Supabase signup into a homeschool profile. This database's auth
-- is shared with the YODER HOME app, so the trigger is a strict no-op unless
-- the signup explicitly carries hs_role metadata.
create or replace function hs_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role     text := new.raw_user_meta_data ->> 'hs_role';
  v_student  text := new.raw_user_meta_data ->> 'hs_student';
  v_code     text := new.raw_user_meta_data ->> 'hs_code';
  v_name     text := new.raw_user_meta_data ->> 'hs_display_name';
  v_expected text;
  v_matched  int;
begin
  if v_role is null then
    return new;                                  -- not a homeschool signup
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

drop trigger if exists hs_on_auth_user_created on auth.users;
create trigger hs_on_auth_user_created
  after insert on auth.users
  for each row execute function hs_handle_new_user();
