-- Not every subject asks for a narration. Maths wants working and questions,
-- so the label on the daily write-up box is per course rather than fixed.
-- Null keeps the default, "Narration".
alter table hs_courses
  add column if not exists notes_label text;

update hs_courses
   set notes_label = 'Lesson notes'
 where name in ('Geometry', 'Algebra 2');
