-- A work study day is logged as hours worked rather than a reading, so the
-- daily row carries a clock in and out alongside the usual note.
alter table hs_courses
  add column if not exists tracks_hours boolean not null default false;

alter table hs_completions
  add column if not exists clock_in  time,
  add column if not exists clock_out time;

insert into hs_courses (student_id, school_year_id, name, short_name, color,
                        credits, sort_order, first_day, last_day,
                        tracks_hours, notes_label)
select (select id from hs_students where name = 'Seth'),
       (select id from hs_school_years where is_active),
       'Work Study Program', 'Work Study', 'teal',
       2, 7, 1, 180, true, 'What I did or learned'
on conflict (student_id, school_year_id, name) do update
   set tracks_hours = true, notes_label = excluded.notes_label;

insert into hs_lessons (course_id, day_number, title)
select c.id, d.day_number, 'Work study'
from hs_courses c
cross join generate_series(1, 180) as d(day_number)
where c.name = 'Work Study Program'
  and not exists (
    select 1 from hs_lessons l
    where l.course_id = c.id and l.day_number = d.day_number);
