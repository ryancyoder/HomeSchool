-- Some courses are not planned in advance: the student reads where they are up
-- to and records the passage themselves. Bible works this way, so the daily row
-- exists only to hold what they read and their narration of it.
alter table hs_courses
  add column if not exists student_records_reading boolean not null default false;

-- Written by the student alongside their narration. Not covered by the grading
-- guard, which only strips the parent-owned columns.
alter table hs_completions
  add column if not exists student_passage text;

update hs_courses set student_records_reading = true where name = 'Bible';

-- One row per school day for each such course, so every day has somewhere to
-- record a passage and a narration.
insert into hs_lessons (course_id, day_number, title)
select c.id, d.day_number, 'Bible reading'
from hs_courses c
cross join generate_series(1, 180) as d(day_number)
where c.name = 'Bible'
  and not exists (
    select 1 from hs_lessons l
    where l.course_id = c.id and l.day_number = d.day_number);
