-- Cover art from Open Library, keyed by a widely-held edition's ISBN.
-- default=false makes Open Library 404 on a miss rather than serving a blank
-- placeholder image, so the BookCover component's error fallback can take over
-- and print the title instead.
update hs_books b
   set cover_url = 'https://covers.openlibrary.org/b/isbn/' || v.isbn || '-L.jpg?default=false',
       author    = coalesce(b.author, v.author)
from (values
  ('The Red Badge of Courage',                '9781593080105', 'Stephen Crane'),
  ('To Kill a Mockingbird',                   '9780446310789', 'Harper Lee'),
  ('The Great Gatsby',                        '9780743273565', 'F. Scott Fitzgerald'),
  ('Fahrenheit 451',                          '9781451673319', 'Ray Bradbury'),
  ('The Outsiders',                           '9780142407332', 'S. E. Hinton'),
  ('An Unquiet Mind',                         '9780679763307', 'Kay Redfield Jamison'),
  ('Man''s Search for Meaning',               '9780807014295', 'Viktor E. Frankl'),
  ('The Man Who Mistook His Wife for a Hat',  '9780684853949', 'Oliver Sacks'),
  ('Unbroken',                                '9780812974492', 'Laura Hillenbrand')
) as v(title, isbn, author)
where b.title = v.title;
