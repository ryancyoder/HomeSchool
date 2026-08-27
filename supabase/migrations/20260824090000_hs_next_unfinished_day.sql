-- The lowest school day still holding unfinished work for this student, or
-- null when everything scheduled is done. Answered in the database because the
-- alternative is pulling every lesson and completion across every course,
-- which is more than a thousand rows.
--
-- security invoker: the caller's RLS decides which courses are counted, so a
-- student asking about a sibling gets null.
create or replace function hs_next_unfinished_day(p_student_id uuid)
returns int
language sql stable security invoker set search_path = public as $$
  select min(l.day_number)
  from hs_lessons l
  join hs_courses c on c.id = l.course_id
  left join hs_completions cm
         on cm.lesson_id = l.id and cm.student_id = p_student_id
  where c.student_id = p_student_id
    and coalesce(cm.done, false) = false;
$$;

revoke all on function hs_next_unfinished_day(uuid) from anon, authenticated;
grant execute on function hs_next_unfinished_day(uuid) to authenticated;
