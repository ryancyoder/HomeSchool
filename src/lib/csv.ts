/**
 * Minimal RFC4180-ish parser. Accepts comma- or tab-separated text so a
 * paste straight out of a spreadsheet works without saving a file first.
 */
export function parseDelimited(text: string): string[][] {
  const sample = text.split("\n").slice(0, 5).join("\n");
  const delimiter = sample.includes("\t") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

export type ImportedLesson = {
  day_number: number;
  title: string;
  description: string | null;
  reading: string | null;
  assignment: string | null;
  estimated_minutes: number | null;
};

const HEADER_ALIASES: Record<string, keyof ImportedLesson> = {
  day: "day_number",
  "day #": "day_number",
  "day number": "day_number",
  lesson: "title",
  title: "title",
  topic: "title",
  description: "description",
  notes: "description",
  reading: "reading",
  read: "reading",
  assignment: "assignment",
  do: "assignment",
  work: "assignment",
  minutes: "estimated_minutes",
  min: "estimated_minutes",
  time: "estimated_minutes",
};

/**
 * Maps rows onto lessons. If the first row looks like a header its names drive
 * the column order; otherwise columns are assumed to be
 * day, title, reading, assignment, minutes.
 */
export function rowsToLessons(rows: string[][]): {
  lessons: ImportedLesson[];
  errors: string[];
} {
  if (rows.length === 0) return { lessons: [], errors: ["Nothing to import."] };

  const errors: string[] = [];
  const first = rows[0].map((c) => c.toLowerCase());
  const looksLikeHeader = first.some((c) => c in HEADER_ALIASES) && isNaN(Number(first[0]));

  const columns: (keyof ImportedLesson | null)[] = looksLikeHeader
    ? first.map((c) => HEADER_ALIASES[c] ?? null)
    : ["day_number", "title", "reading", "assignment", "estimated_minutes"];

  const body = looksLikeHeader ? rows.slice(1) : rows;
  const lessons: ImportedLesson[] = [];

  body.forEach((row, index) => {
    const rec: Record<string, string> = {};
    columns.forEach((col, i) => {
      if (col) rec[col] = row[i] ?? "";
    });

    const day = Number(rec.day_number);
    if (!Number.isInteger(day) || day < 1) {
      errors.push(`Row ${index + 1}: "${row[0] ?? ""}" is not a day number.`);
      return;
    }
    if (!rec.title) {
      errors.push(`Row ${index + 1}: missing a lesson title.`);
      return;
    }

    const minutes = Number(rec.estimated_minutes);
    lessons.push({
      day_number: day,
      title: rec.title,
      description: rec.description || null,
      reading: rec.reading || null,
      assignment: rec.assignment || null,
      estimated_minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    });
  });

  return { lessons, errors };
}
