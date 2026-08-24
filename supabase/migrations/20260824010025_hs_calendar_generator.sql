-- Rebuilds the instructional-day calendar for a school year. Walks forward
-- from start_date, taking the first `days_per_week` weekdays of each calendar
-- week (Mon-first) and skipping any date listed in p_skip (holidays/breaks),
-- until total_days days have been placed. Existing check-offs are untouched
-- because completions hang off lessons, not off school days.
--
-- auth.uid() is null for direct/service-role connections; only gate the
-- guard on end users coming through PostgREST.
create or replace function hs_generate_school_days(
  p_year_id uuid,
  p_skip    date[] default '{}'
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_start    date;
  v_total    int;
  v_per_week int;
  v_cursor   date;
  v_placed   int := 0;
  v_in_week  int := 0;
  v_week     int := 1;
  v_dow      int;
begin
  if auth.uid() is not null and not hs_is_parent() then
    raise exception 'Only a parent can rebuild the calendar.';
  end if;

  select start_date, total_days, days_per_week
    into v_start, v_total, v_per_week
    from hs_school_years where id = p_year_id;
  if v_start is null then
    raise exception 'Unknown school year.';
  end if;

  delete from hs_school_days where school_year_id = p_year_id;

  -- back up to the Monday of the starting week so week boundaries line up
  v_cursor := v_start - ((extract(isodow from v_start)::int - 1));

  while v_placed < v_total loop
    v_dow := extract(isodow from v_cursor)::int;   -- 1 = Mon .. 7 = Sun

    if v_cursor >= v_start
       and v_in_week < v_per_week
       and not (v_cursor = any (p_skip))
       and (v_per_week >= 6 or v_dow <= 5)         -- 5-day weeks stay Mon-Fri
    then
      v_placed  := v_placed + 1;
      v_in_week := v_in_week + 1;
      insert into hs_school_days (school_year_id, day_number, week_number, day_date)
      values (p_year_id, v_placed, v_week, v_cursor);
    end if;

    if v_dow = 7 then                              -- rolled past Sunday
      v_week    := v_week + 1;
      v_in_week := 0;
    end if;

    v_cursor := v_cursor + 1;

    if v_cursor > v_start + 900 then
      raise exception 'Could not place % days within ~2.5 years.', v_total;
    end if;
  end loop;

  return v_placed;
end $$;
