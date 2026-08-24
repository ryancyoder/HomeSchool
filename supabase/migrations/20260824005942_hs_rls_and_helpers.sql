-- security definer helpers: they read hs_profiles/hs_students with RLS
-- bypassed, which keeps the policies below from recursing.

create or replace function hs_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hs_profiles where id = auth.uid());
$$;

create or replace function hs_is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hs_profiles where id = auth.uid() and role = 'parent');
$$;

create or replace function hs_my_student_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from hs_students where user_id = auth.uid();
$$;

alter table hs_settings     enable row level security;
alter table hs_profiles     enable row level security;
alter table hs_school_years enable row level security;
alter table hs_school_days  enable row level security;
alter table hs_students     enable row level security;
alter table hs_courses      enable row level security;
alter table hs_units        enable row level security;
alter table hs_lessons      enable row level security;
alter table hs_completions  enable row level security;
alter table hs_daily_logs   enable row level security;

-- settings: parent-only, and never expose the signup code to the client.
create policy hs_settings_parent on hs_settings
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- profiles: you see yourself; a parent sees everyone.
create policy hs_profiles_read on hs_profiles
  for select to authenticated using (id = auth.uid() or hs_is_parent());
create policy hs_profiles_self_update on hs_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy hs_profiles_parent_write on hs_profiles
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- calendar + roster: readable by anyone in the school, writable by a parent.
create policy hs_years_read on hs_school_years
  for select to authenticated using (hs_is_member());
create policy hs_years_write on hs_school_years
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

create policy hs_days_read on hs_school_days
  for select to authenticated using (hs_is_member());
create policy hs_days_write on hs_school_days
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

create policy hs_students_read on hs_students
  for select to authenticated using (hs_is_member());
create policy hs_students_write on hs_students
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- coursework: a student sees only their own courses.
create policy hs_courses_read on hs_courses
  for select to authenticated
  using (hs_is_parent() or student_id = hs_my_student_id());
create policy hs_courses_write on hs_courses
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

create policy hs_units_read on hs_units
  for select to authenticated
  using (hs_is_parent() or exists (
    select 1 from hs_courses c
    where c.id = hs_units.course_id and c.student_id = hs_my_student_id()));
create policy hs_units_write on hs_units
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

create policy hs_lessons_read on hs_lessons
  for select to authenticated
  using (hs_is_parent() or exists (
    select 1 from hs_courses c
    where c.id = hs_lessons.course_id and c.student_id = hs_my_student_id()));
create policy hs_lessons_write on hs_lessons
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- check-offs: a student may only check off their own work, and may never
-- set the parent_verified / grade columns (enforced by trigger below).
create policy hs_completions_read on hs_completions
  for select to authenticated
  using (hs_is_parent() or student_id = hs_my_student_id());
create policy hs_completions_student_write on hs_completions
  for all to authenticated
  using (student_id = hs_my_student_id())
  with check (student_id = hs_my_student_id());
create policy hs_completions_parent_write on hs_completions
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

create policy hs_daily_logs_read on hs_daily_logs
  for select to authenticated
  using (hs_is_parent() or student_id = hs_my_student_id());
create policy hs_daily_logs_student_write on hs_daily_logs
  for all to authenticated
  using (student_id = hs_my_student_id())
  with check (student_id = hs_my_student_id());
create policy hs_daily_logs_parent_write on hs_daily_logs
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- A student writing their own row must not be able to grade themselves.
create or replace function hs_guard_student_grading() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if hs_is_parent() then
    return new;
  end if;
  new.parent_verified := coalesce(
    (select c.parent_verified from hs_completions c where c.id = new.id), false);
  new.grade := (select c.grade from hs_completions c where c.id = new.id);
  new.parent_note := (select c.parent_note from hs_completions c where c.id = new.id);
  return new;
end $$;

drop trigger if exists hs_completions_guard on hs_completions;
create trigger hs_completions_guard before insert or update on hs_completions
  for each row execute function hs_guard_student_grading();

create or replace function hs_guard_student_signoff() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if hs_is_parent() then
    return new;
  end if;
  new.parent_signed_off_at := (
    select d.parent_signed_off_at from hs_daily_logs d where d.id = new.id);
  return new;
end $$;

drop trigger if exists hs_daily_logs_guard on hs_daily_logs;
create trigger hs_daily_logs_guard before insert or update on hs_daily_logs
  for each row execute function hs_guard_student_signoff();
