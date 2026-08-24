-- Pin the search_path on the one function that was missing it.
create or replace function hs_touch_updated_at() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Trigger functions must never be reachable as PostgREST RPC endpoints.
-- Firing a trigger does not check EXECUTE, so revoking here costs nothing.
revoke all on function hs_handle_new_user()       from anon, authenticated;
revoke all on function hs_guard_student_grading() from anon, authenticated;
revoke all on function hs_guard_student_signoff() from anon, authenticated;
revoke all on function hs_touch_updated_at()      from anon, authenticated;

-- Rebuilding the calendar is a parent action. It is guarded internally too,
-- but a signed-out caller should not be able to reach it at all: the internal
-- guard only skips when auth.uid() is null, which is the anon case.
revoke all on function hs_generate_school_days(uuid, date[]) from anon, authenticated;
grant execute on function hs_generate_school_days(uuid, date[]) to authenticated;

-- These only ever describe the caller, but anon has no business calling them.
revoke all on function hs_is_member()     from anon;
revoke all on function hs_is_parent()     from anon;
revoke all on function hs_my_student_id() from anon;
