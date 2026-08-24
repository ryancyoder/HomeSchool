-- Homeschool app. All objects prefixed hs_ to stay isolated from the
-- existing YODER HOME tables sharing this database.

create table if not exists hs_settings (
  key   text primary key,
  value text
);

create table if not exists hs_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('parent','student')),
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists hs_school_years (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  start_date    date not null,
  total_days    int  not null default 180,
  days_per_week int  not null default 5 check (days_per_week between 1 and 7),
  is_active     boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists hs_school_years_single_active
  on hs_school_years (is_active) where is_active;

-- The 180 instructional days, each pinned to a real calendar date and a week.
create table if not exists hs_school_days (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references hs_school_years(id) on delete cascade,
  day_number     int  not null check (day_number > 0),
  week_number    int  not null check (week_number > 0),
  day_date       date not null,
  label          text,
  unique (school_year_id, day_number),
  unique (school_year_id, day_date)
);
create index if not exists hs_school_days_year_week
  on hs_school_days (school_year_id, week_number);

create table if not exists hs_students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  user_id    uuid unique references auth.users(id) on delete set null,
  grade      text,
  color      text not null default 'sky',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists hs_courses (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references hs_students(id) on delete cascade,
  school_year_id uuid not null references hs_school_years(id) on delete cascade,
  name           text not null,
  short_name     text,
  textbook       text,
  color          text not null default 'slate',
  credits        numeric,
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (student_id, school_year_id, name)
);

create table if not exists hs_units (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references hs_courses(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0
);

create table if not exists hs_lessons (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references hs_courses(id) on delete cascade,
  unit_id           uuid references hs_units(id) on delete set null,
  day_number        int  not null check (day_number > 0),
  sort_order        int  not null default 0,
  title             text not null,
  description       text,
  reading           text,
  assignment        text,
  estimated_minutes int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists hs_lessons_course_day on hs_lessons (course_id, day_number);
create index if not exists hs_lessons_day on hs_lessons (day_number);

create table if not exists hs_completions (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references hs_lessons(id) on delete cascade,
  student_id      uuid not null references hs_students(id) on delete cascade,
  done            boolean not null default true,
  completed_at    timestamptz not null default now(),
  minutes_spent   int,
  student_note    text,
  parent_verified boolean not null default false,
  parent_note     text,
  grade           text,
  unique (lesson_id, student_id)
);
create index if not exists hs_completions_student on hs_completions (student_id);

create table if not exists hs_daily_logs (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references hs_students(id) on delete cascade,
  school_day_id        uuid not null references hs_school_days(id) on delete cascade,
  notes                text,
  submitted_at         timestamptz,
  parent_signed_off_at timestamptz,
  unique (student_id, school_day_id)
);

create or replace function hs_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists hs_lessons_touch on hs_lessons;
create trigger hs_lessons_touch before update on hs_lessons
  for each row execute function hs_touch_updated_at();
