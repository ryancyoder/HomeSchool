-- A book belongs to one course, so Seth's copy and Selah's are separate rows.
-- That keeps visibility inheriting from the course they already have access to,
-- and lets each of them carry their own reading days and narrations.
create table if not exists hs_books (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references hs_courses(id) on delete cascade,
  title      text not null,
  author     text,
  cover_url  text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, title)
);
create index if not exists hs_books_course on hs_books (course_id);

alter table hs_lessons
  add column if not exists book_id uuid references hs_books(id) on delete set null;
create index if not exists hs_lessons_book on hs_lessons (book_id);

alter table hs_books enable row level security;

create policy hs_books_read on hs_books
  for select to authenticated
  using (hs_is_parent() or exists (
    select 1 from hs_courses c
    where c.id = hs_books.course_id and c.student_id = hs_my_student_id()));

create policy hs_books_write on hs_books
  for all to authenticated using (hs_is_parent()) with check (hs_is_parent());

-- Seed books only where a lesson title already IS a book title. Topic-titled
-- courses (Biology, Geometry, Government & Economics) are left for a parent to
-- describe rather than guessed at here.
insert into hs_books (course_id, title, author, sort_order)
select c.id, b.title, b.author, b.sort_order
from hs_courses c
join (values
  ('American Literature & Composition','The Red Badge of Courage','Stephen Crane',1),
  ('American Literature & Composition','To Kill a Mockingbird','Harper Lee',2),
  ('American Literature & Composition','The Great Gatsby','F. Scott Fitzgerald',3),
  ('American Literature & Composition','Fahrenheit 451','Ray Bradbury',4),
  ('American Literature & Composition','The Outsiders','S. E. Hinton',5),
  ('Psychology','An Unquiet Mind','Kay Redfield Jamison',1),
  ('Psychology','Man''s Search for Meaning','Viktor E. Frankl',2),
  ('Psychology','The Man Who Mistook His Wife for a Hat','Oliver Sacks',3),
  ('Life Skills','Unbroken','Laura Hillenbrand',1)
) as b(course, title, author, sort_order) on b.course = c.name
where exists (
  select 1 from hs_lessons l where l.course_id = c.id and l.title = b.title)
on conflict (course_id, title) do nothing;

update hs_lessons l
   set book_id = b.id
  from hs_books b
 where b.course_id = l.course_id and b.title = l.title and l.book_id is null;

-- Per-book counts for the library, aggregated in the database rather than by
-- shipping every reading day to the client.
create or replace function hs_book_progress(p_student_id uuid)
returns table (
  book_id      uuid,
  reading_days bigint,
  days_done    bigint,
  narrations   bigint,
  first_day    int,
  last_day     int
)
language sql stable security invoker set search_path = public as $$
  select b.id,
         count(l.id),
         count(cm.id) filter (where cm.done),
         count(cm.id) filter (where cm.note_written_at is not null),
         min(l.day_number),
         max(l.day_number)
  from hs_books b
  join hs_courses c on c.id = b.course_id
  left join hs_lessons l on l.book_id = b.id
  left join hs_completions cm
         on cm.lesson_id = l.id and cm.student_id = p_student_id
  where c.student_id = p_student_id
  group by b.id;
$$;

revoke all on function hs_book_progress(uuid) from anon, authenticated;
grant execute on function hs_book_progress(uuid) to authenticated;
