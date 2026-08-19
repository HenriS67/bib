INSERT INTO authors (id, name, image)
VALUES
  ('thomas-aquinas', 'Saint Thomas d''Aquin', '/authors/thomas-aquinas.jpg'),
  ('aristotle', 'Aristote', '/authors/aristotle.jpg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO books (id, title, author_id, pages, pdf_url)
VALUES
  ('summa-theologiae', 'Summa Theologiae', 'thomas-aquinas', 450, '/books/summa-theologiae.pdf'),
  ('metaphysics', 'Métaphysique', 'aristotle', 350, '/books/metaphysics.pdf')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author_id = EXCLUDED.author_id,
  pages = EXCLUDED.pages,
  pdf_url = EXCLUDED.pdf_url;