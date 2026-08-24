-- Progress was counted by fetching every lesson row and tallying them in the
-- app. PostgREST caps a response at 1000 rows, so once a student passed 1000
-- lessons the later courses silently reported short totals. Counting in the
-- database removes the cap, the oversized lesson-id filter that followed it,
-- and a round trip.
--
-- security invoker on purpose: the caller's own RLS decides which courses,
-- lessons and completions are visible, so a student asking for a sibling's id
-- gets nothing back.
create or replace function hs_course_progress(p_student_id uuid)
returns table (course_id uuid, total bigint, done bigint)
language sql stable security invoker set search_path = public as $$
  select c.id,
         count(l.id),
         count(cm.id) filter (where cm.done)
  from hs_courses c
  left join hs_lessons l on l.course_id = c.id
  left join hs_completions cm
         on cm.lesson_id = l.id and cm.student_id = p_student_id
  where c.student_id = p_student_id
  group by c.id;
$$;

revoke all on function hs_course_progress(uuid) from anon, authenticated;
grant execute on function hs_course_progress(uuid) to authenticated;
