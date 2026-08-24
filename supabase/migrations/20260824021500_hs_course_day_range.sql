-- A course need not run the whole year: a semester course occupies a slice of
-- the day numbers. Defaults cover the full year, so existing courses are
-- unaffected.
alter table hs_courses
  add column if not exists first_day int not null default 1,
  add column if not exists last_day  int not null default 180;

alter table hs_courses
  drop constraint if exists hs_courses_day_range_valid;
alter table hs_courses
  add constraint hs_courses_day_range_valid
  check (first_day >= 1 and last_day >= first_day);
