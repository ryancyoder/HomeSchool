export type Role = "parent" | "student";

export type Profile = {
  id: string;
  role: Role;
  display_name: string;
};

export type Student = {
  id: string;
  name: string;
  user_id: string | null;
  grade: string | null;
  color: string;
  sort_order: number;
};

export type SchoolYear = {
  id: string;
  name: string;
  start_date: string;
  total_days: number;
  days_per_week: number;
  is_active: boolean;
};

export type SchoolDay = {
  id: string;
  school_year_id: string;
  day_number: number;
  week_number: number;
  day_date: string;
  label: string | null;
};

export type Course = {
  id: string;
  student_id: string;
  school_year_id: string;
  name: string;
  short_name: string | null;
  textbook: string | null;
  color: string;
  credits: number | null;
  sort_order: number;
  /** A semester course occupies a slice of the year's day numbers. */
  first_day: number;
  last_day: number;
};

export type Lesson = {
  id: string;
  course_id: string;
  unit_id: string | null;
  day_number: number;
  sort_order: number;
  title: string;
  description: string | null;
  reading: string | null;
  assignment: string | null;
  estimated_minutes: number | null;
};

export type Completion = {
  id: string;
  lesson_id: string;
  student_id: string;
  done: boolean;
  completed_at: string;
  minutes_spent: number | null;
  student_note: string | null;
  parent_verified: boolean;
  parent_note: string | null;
  grade: string | null;
};

export type DailyLog = {
  id: string;
  student_id: string;
  school_day_id: string;
  notes: string | null;
  submitted_at: string | null;
  parent_signed_off_at: string | null;
};

/** A lesson joined to its course and the current student's check-off state. */
export type LessonWithState = Lesson & {
  course: Course;
  completion: Completion | null;
};
