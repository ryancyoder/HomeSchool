# Yoder Home School

A homeschool planner for Seth and Selah — weekly overviews, a daily check-off
log, a calendar, and the full 180-day scope-and-sequence for every subject.
Parents get a dashboard over both students plus a curriculum editor.

Built with Next.js (App Router) and Supabase.

## Who logs in

| Login  | Sees                                                                |
| ------ | ------------------------------------------------------------------- |
| Seth   | Only his own courses, lessons and check-offs                        |
| Selah  | Only her own courses, lessons and check-offs                        |
| Parent | Both students, all coursework, the planner and the school settings  |

Everyone signs up at `/signup` with the **family code**, which a parent can
read and change under **Parent → School settings**. A student's account links
itself to the right roster entry by the name they pick at signup.

## The views

- **Today** — the day's work from every subject as a check-off list, plus a
  notes box. Arrows step through school days; a parent can open any student's
  day from the dashboard.
- **This Week** — the week's coursework broken down by subject with progress
  bars, then day by day. This is the "what's coming this week" overview.
- **Calendar** — a month grid. School days are shaded, each shows how much is
  done and a coloured dot per subject with work scheduled. Click a day to open
  its check-off list.
- **Subjects** — every course with year-long progress; open one for the
  complete day-1-to-180 list of lessons and readings, grouped by week.
- **Parent** — both students side by side, today's and this week's progress,
  per-course completion, recent daily notes, and a link into the planner for
  each course.

## Planning the year

**Parent → School settings** sets the year: first day, how many school days
(180), how many days a week, and which dates to skip for holidays. Saving
rebuilds the day-to-date calendar. Lessons are attached to *day numbers*, not
dates, so moving the start date or inserting a break slides the whole plan
along without breaking anything.

**Parent → (course) → Plan lessons** is the curriculum editor: a row per school
day with lesson title, reading, assignment and estimated minutes. Edits save on
blur. Clearing a title deletes that day's lesson.

For bulk entry use **Paste / import a plan** and paste straight from a
spreadsheet (tab-separated) or as CSV:

```csv
day,title,reading,assignment,minutes
1,Course intro,Preface,Set up your notebook,30
2,The Puritan mind,"Bradford, Of Plymouth Plantation ch. 1-2",Reading response,45
```

A header row is optional; without one the columns are assumed to be
`day, title, reading, assignment, minutes`. Column names are flexible
(`lesson`/`topic` for the title, `read` for reading, `do`/`work` for
assignment, `min`/`time` for minutes).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

## Database

The schema lives in `supabase/migrations/`. Every object is prefixed `hs_`
because this Supabase project is shared with another app.

| Table             | Holds                                                       |
| ----------------- | ----------------------------------------------------------- |
| `hs_profiles`     | Role (`parent` / `student`) per auth user                   |
| `hs_students`     | The roster, each optionally linked to a login               |
| `hs_school_years` | Start date, total days, days per week                       |
| `hs_school_days`  | The 180 instructional days, each pinned to a calendar date  |
| `hs_courses`      | One row per student per subject                             |
| `hs_lessons`      | A lesson on a day number, with reading and assignment       |
| `hs_completions`  | A student's check-off, plus parent verification and grade   |
| `hs_daily_logs`   | The student's notes for a day, and the parent's sign-off    |
| `hs_settings`     | The family signup code                                      |

### Security model

Row Level Security is on for every table, and the rules are enforced in the
database rather than in the UI:

- A student can read only their own courses, lessons, check-offs and logs.
- A student can write only their own check-offs and notes. Triggers strip
  `parent_verified`, `grade` and `parent_note` from any student write, so a
  student cannot grade themselves or forge a parent sign-off.
- Only a parent can create or edit courses, lessons, the roster or the
  calendar, and only a parent can read the family signup code.
- The signup trigger is a no-op unless the signup carries `hs_role` metadata,
  so it never interferes with the other app sharing this database's auth.
