-- Roster, courses and calendar for the 2026-2027 year.
-- Safe to re-run: every insert is idempotent.

insert into hs_settings (key, value)
values ('signup_code', upper(substr(encode(gen_random_bytes(6),'hex'), 1, 8)))
on conflict (key) do nothing;

insert into hs_school_years (name, start_date, total_days, days_per_week, is_active)
values ('2026-2027', date '2026-08-24', 180, 5, true)
on conflict do nothing;

insert into hs_students (name, grade, color, sort_order) values
  ('Seth',  '11th', 'blue',   1),
  ('Selah', '10th', 'violet', 2)
on conflict (name) do nothing;

with y as (select id from hs_school_years where is_active limit 1),
     s as (select id, name from hs_students)
insert into hs_courses (student_id, school_year_id, name, short_name, color, credits, sort_order)
select s.id, y.id, c.name, c.short_name, c.color, c.credits, c.sort_order
from y, s
join lateral (values
  ('Seth','American Literature & Composition','Am Lit','amber',   2.0, 1),
  ('Seth','Geometry & Algebra 2',              'Math',  'emerald', 2.0, 2),
  ('Seth','Government & Economics',            'Gov/Econ','indigo',2.0, 3),
  ('Seth','Life Skills',                       'Life Skills','rose',2.0,4),
  ('Seth','Bible',                             'Bible', 'sky',     2.0, 5),
  ('Selah','American Literature & Composition','Am Lit','amber',   2.0, 1),
  ('Selah','Geometry',                         'Geometry','emerald',2.0,2),
  ('Selah','Government & Economics',           'Gov/Econ','indigo', 2.0, 3),
  ('Selah','Psychology',                       'Psych', 'fuchsia', 2.0, 4),
  ('Selah','Bible',                            'Bible', 'sky',     2.0, 5),
  ('Selah','Biology',                          'Biology','teal',   2.0, 6)
) as c(student, name, short_name, color, credits, sort_order)
  on c.student = s.name
on conflict (student_id, school_year_id, name) do nothing;

select hs_generate_school_days((select id from hs_school_years where is_active limit 1));
