-- completed_at is rewritten on every save, so ticking a box tomorrow would make
-- an old narration look new. Stamp the moment the text itself changes.
alter table hs_completions
  add column if not exists note_written_at timestamptz;

-- clock_timestamp() rather than now(): now() is frozen for the whole
-- transaction, so two narrations saved in one batch would be indistinguishable
-- and the ordering of a burst would be arbitrary.
create or replace function hs_stamp_note_written() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.student_note, '') = '' then
    new.note_written_at := null;                       -- cleared, so not unread
  elsif tg_op = 'INSERT'
     or new.student_note is distinct from old.student_note then
    new.note_written_at := clock_timestamp();
  end if;
  return new;
end $$;

revoke all on function hs_stamp_note_written() from anon, authenticated;

-- Runs after hs_completions_guard (trigger order is by name), which never
-- touches student_note.
drop trigger if exists hs_completions_stamp_note on hs_completions;
create trigger hs_completions_stamp_note
  before insert or update on hs_completions
  for each row execute function hs_stamp_note_written();

update hs_completions
   set note_written_at = completed_at
 where coalesce(student_note, '') <> '' and note_written_at is null;

-- One watermark per parent, so each has an independent count.
create table if not exists hs_narration_reads (
  profile_id   uuid primary key references hs_profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table hs_narration_reads enable row level security;

create policy hs_narration_reads_own on hs_narration_reads
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- security invoker so the caller's RLS decides what is counted; a student
-- calling it gets nothing, since the badge is a parent feature.
create or replace function hs_unread_narrations() returns int
language sql stable security invoker set search_path = public as $$
  select case when hs_is_parent() then (
    select count(*)::int
    from hs_completions c
    where c.note_written_at is not null
      and c.note_written_at > coalesce(
        (select r.last_seen_at from hs_narration_reads r
          where r.profile_id = auth.uid()),
        '-infinity'::timestamptz)
  ) else 0 end;
$$;

-- Takes no argument: the row is keyed on auth.uid(), so nobody can clear
-- anyone else's badge.
create or replace function hs_mark_narrations_read() returns void
language sql security invoker set search_path = public as $$
  insert into hs_narration_reads (profile_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (profile_id) do update set last_seen_at = now();
$$;

revoke all on function hs_unread_narrations()     from anon, authenticated;
revoke all on function hs_mark_narrations_read()  from anon, authenticated;
grant execute on function hs_unread_narrations()    to authenticated;
grant execute on function hs_mark_narrations_read() to authenticated;
